sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "hodek/gateapps/model/models",
    // "hodek/gateapps/model/qrcodeNew",
    "hodek/gateapps/utils/Formatter",
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/core/Fragment",
    "sap/m/library",
    'sap/ui/core/library',
    "sap/ui/core/format/DateFormat",
    "sap/m/UploadCollectionParameter",
], (Controller, Models, Formatter, Dialog, Button, MessageBox, MessageToast, Fragment, mobileLibrary, coreLibrary, DateFormat, UploadCollectionParameter) => {
    "use strict";
    //QR & PDF in use libraries //
    jQuery.sap.require("hodek.gateapps.model.qrCode");
    jQuery.sap.require("hodek.gateapps.model.jspdf");
    jQuery.sap.require("hodek.gateapps.model.JsBarcode");
    return Controller.extend("hodek.gateapps.controller.GEAsnDetail", {
        onInit() {
            const oRouter = this.getOwnerComponent().getRouter();
            this.oParameters = {
                "$top": 200000
            };
            let that = this;
            this.sAsn = "";
            this.selectedPOSchAggrVendor = "";
            this.f4HelpModel = this.getOwnerComponent().getModel("vendorModel");
            this.inGateEntryModel = this.getOwnerComponent().getModel("vendorModel");
            oRouter.getRoute("RouteGEAsnDetail").attachPatternMatched(this._onRouteMatched, this);

        },
        formatter: Formatter,
        _onRouteMatched: function (oEvent) {
            this.getView().setBusy(true);
            var oAsnItemsModel = this.getOwnerComponent().getModel("AsnItemsModel");
            var oAsnHeaderModel = this.getOwnerComponent().getModel("AsnHeaderModel");

            // set models at view level
            this.getView().setModel(oAsnItemsModel, "AsnItemsModel");
            this.getView().setModel(oAsnHeaderModel, "AsnHeaderModel");

            let currentAsn = oEvent.getParameter("arguments").asn;
            this.sAsn = currentAsn;
            if (!oAsnItemsModel && !oAsnHeaderModel) {
                this.getView().setBusy(false);
                this.onNavBack();
                return;
            }
            this.getView().setBusy(false);
        },
        onNavBack: function () {

            this.getOwnerComponent().getRouter().navTo("RouteGEAsn", {
                po: this.purchaseOrder
            }, true); // replace with actual route

        },
        onNavFirstPage: function () {
            this.getOwnerComponent().getRouter().navTo("RouteGEAsn", {}, true); // replace with actual route
        },

        onSave: function () {
            let that = this;
            let InvoiceNo = that.getView().byId("idDocInvNo").getText();
            let InvoiceDate = that.getView().byId("idRAPO_InvDate").getText(),
                Vendor = that.getView().byId("idSupplier").getText(),
                Vendorname = that.getView().byId("idSupplierName").getText();
            let oQrCodeData = {
                InvoiceNo,
                InvoiceDate,
                Vendor,
                Vendorname,
                "AsnNo": this.sAsn
            }
            MessageBox.confirm("Are you sure you want to save this Gate Entry?", {
                title: "Confirm Save",
                actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                emphasizedAction: MessageBox.Action.YES,
                onClose: function (oAction) {
                    if (oAction !== MessageBox.Action.YES) {
                        return; // Exit if user cancels
                    }
                    that.getView().setBusy(true);
                    let gateEntryNo = `IN${that.sAsn}`
                    // Prepare the update payload
                    const payload = {
                        GateEntryId: gateEntryNo, // Replace with your actual value,
                        Status: '03',
                        Inwardtype: 'RECPO'
                    };
                    const sPath = `/InwardGateHeader('${that.sAsn}')`;

                    that.inGateEntryModel.update(sPath, payload, {
                        success: function (oData, oResponse) {
                            that.getView().setBusy(false);

                            // Handle the response as needed
                            const qrDataToPrintQRCode = oQrCodeData;
                            const qrData = oQrCodeData;
                            const gateEntryNo = qrData.AsnNo;

                            const oTable = that.getView().byId("idTable_RAPO");
                            const aItems = oTable.getModel("AsnItemsModel").getProperty("/Results") || [];

                            // Show success dialog
                            const dialog = new Dialog("idPrintQRDialog", {
                                title: 'Success',
                                type: 'Message',
                                state: 'Success',
                                content: new sap.m.Text({
                                    text: `Gate Entry IN${gateEntryNo} updated successfully`
                                }),
                                beginButton: new Button({
                                    text: 'Download Gate Entry',
                                    press: function () {
                                        that.onViewQR(qrData); // call function to download QR code
                                        dialog.close();
                                    }
                                }),
                                afterClose: function () {
                                    dialog.destroy();
                                }
                            });

                            dialog.open();

                            dialog.attachBrowserEvent("keydown", function (oEvent) {
                                if (oEvent.key === "Escape") {
                                    oEvent.preventDefault();
                                    that.onViewQR(qrDataToPrintQRCode);
                                    dialog.close();
                                }
                            });
                        },

                        error: function (e) {
                            that.getView().setBusy(false);
                            let msg;

                            if (e.responseText && (e.statusCode === 400 || e.statusCode === "400")) {
                                const err = JSON.parse(e.responseText);
                                msg = err.error.message.value;
                            } else if (e.responseText && (e.statusCode === 500 || e.statusCode === "500")) {
                                const parser = new DOMParser();
                                const xmlDoc = parser.parseFromString(e.responseText, "text/xml");
                                msg = xmlDoc.documentElement.childNodes[1].innerHTML;
                            } else {
                                msg = e.message;
                            }

                            const bCompact = !!that.getView().$().closest(".sapUiSizeCompact").length;
                            MessageBox.error(msg, {
                                styleClass: bCompact ? "sapUiSizeCompact" : ""
                            });
                        }
                    });
                }
            })
        },

        onViewQR: function (qrData) {
            let that = this;
            //let oQRCodeBox = new sap.m.VBox({});
            let oQRCodeBox = this.getView().byId("idVBox_QRCode");
            oQRCodeBox.setVisible(true);
            const oHtmlComp = new sap.ui.core.HTML({
                content: '<canvas id="qrCanvas" width="200" height="200" style="display:none;"></canvas>'
            });
            oQRCodeBox.addItem(oHtmlComp);

            // setTimeout(function () {
            //     let sQRCodeNumber = qrData.AsnNo; // Data to encode in QR Code
            //     // Generate QR Code using qrcode.js
            //     QRCode.toCanvas(document.getElementById('qrCanvas'), sQRCodeNumber, function (error) {
            //         if (error) {
            //             sap.m.MessageToast.show("QR Code generation failed!");
            //             return;
            //         }
            //         sap.m.MessageToast.show("QR Code generated!");
            //         // After generating the QR Code, create PDF
            //         that._generatePDF(qrData);
            //         oQRCodeBox.setVisible(false);
            //         that.onNavFirstPage();

            //     }.bind(this));
            // }, 200);
            setTimeout(function () {
                try {
                    let sBarcodeData = qrData.AsnNo; // The value to encode in the barcode
                    let oCanvas = document.getElementById("qrCanvas");

                    // Generate barcode using JsBarcode
                    JsBarcode(oCanvas, sBarcodeData, {
                        format: "CODE128",   // Common & widely supported format
                        displayValue: false,  // Show the text below the barcode
                        fontSize: 14,
                        lineColor: "#000",
                        width: 2,
                        height: 50,
                        margin: 10
                    });

                    sap.m.MessageToast.show("Barcode generated!");

                    // After generating the barcode, create PDF
                    that._generatePDF(qrData);
                    oQRCodeBox.setVisible(false);

                } catch (error) {
                    console.error(error);
                    sap.m.MessageToast.show("Barcode generation failed!");
                }
            }, 200);
        },

        _generatePDF: function (qrData) {
            var jsPDF = window.jspdf.jsPDF;
            //var doc = new jsPDF();
            var doc = new jsPDF('l', 'mm', [50, 25]);

            let invDate = qrData.InvoiceDate.replace(/-/g, "/");

            doc.setFont("Helvetica", 'bold');
            doc.setFontSize(4.5);
            doc.setTextColor('#000');
            // Get the canvas element for the QR code
            var canvas = document.getElementById('qrCanvas');
            var imgData = canvas.toDataURL('image/png');
            // Add the QR code image to the PDF
            doc.addImage(imgData, 'PNG', 5, 1, 35, 10);// Adjust size and position as necessary
            doc.text(2, 12, `ASN Number: ${qrData.AsnNo} |`);
            doc.text(23, 12, `Gate Entry No: IN${qrData.AsnNo}`);
            doc.text(2, 15, `Invoice Number: ${qrData.InvoiceNo}`);
            doc.text(2, 18, `Invoice Date: ${invDate}`);


            // doc.text(2, 21, `Supplier: ${qrData.Vendorname}( ${qrData.Vendor} )`);
            let vendorText = `Supplier: ${qrData.Vendorname}( ${qrData.Vendor} )`;
            let wrappedVendor = doc.splitTextToSize(vendorText, 42);
            doc.text(wrappedVendor, 2, 21, { maxWidth: 42, lineHeightFactor: 1.2 });
            // Save the PDF to a file
            doc.save(`Gate_Entry_${qrData.AsnNo}.pdf`);
            this.onNavBack();
        },






    });
});