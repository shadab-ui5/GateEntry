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
    return Controller.extend("hodek.gateapps.controller.GEAsnDetail", {
        onInit() {
            const oRouter = this.getOwnerComponent().getRouter();
            this.oParameters = {
                "$top": 200000
            };
            let that = this;
            this.selectedPOSchAggrVendor = "";
            const oModel = new sap.ui.model.json.JSONModel([]);
            const oModelHeader = new sap.ui.model.json.JSONModel([]);
            this.getView().setModel(oModel, "AsnItemsModel");
            this.getView().setModel(oModelHeader, "AsnHeaderModel");
            this.f4HelpModel = this.getOwnerComponent().getModel("vendorModel");
            this.inGateEntryModel = this.getOwnerComponent().getModel("vendorModel");
            oRouter.getRoute("RouteGEAsnDetail").attachPatternMatched(this._onRouteMatched, this);

        },
        formatter: Formatter,
        _onRouteMatched: function (oEvent) {
            this.getView().getModel("AsnItemsModel").setProperty("/Results", []);
            this.sAsn = oEvent.getParameter("arguments").asn;
            if (!this.sAsn) {
                this.onNavBack();
                return;
            }
            Models.fetchInwardGateHeaderAndItems(this, this.sAsn);

        },
        onNavBack: function () {
            var oHistory = sap.ui.core.routing.History.getInstance();
            var sPreviousHash = oHistory.getPreviousHash();

            if (sPreviousHash !== undefined) {
                window.history.go(-1);
            } else {
                this.getOwnerComponent().getRouter().navTo("RouteGEAsn", {
                    po: this.purchaseOrder
                }, true); // replace with actual route
            }
        },
        onNavFirstPage: function () {
            this.getOwnerComponent().getRouter().navTo("RouteGEAsn", {}, true); // replace with actual route
        },

        onSave: function () {
            let that = this;
            let InvoiceNo = that.getView().byId("idDocInvNo").getText();
            let InvoiceDate = that.getView().byId("idRAPO_InvDate").getText(),
                Vendor = that.getView().byId("idSupplier").getText();
            let oQrCodeData={
                InvoiceNo,
                InvoiceDate,
                Vendor,
                "AsnNo":this.sAsn
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

                    // Prepare the update payload
                    const payload = {
                        GateEntryId: `IN${that.sAsn}`, // Replace with your actual value,
                        Status: '03'
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

            setTimeout(function () {
                let sQRCodeNumber = qrData.AsnNo; // Data to encode in QR Code
                // Generate QR Code using qrcode.js
                QRCode.toCanvas(document.getElementById('qrCanvas'), sQRCodeNumber, function (error) {
                    if (error) {
                        sap.m.MessageToast.show("QR Code generation failed!");
                        return;
                    }
                    sap.m.MessageToast.show("QR Code generated!");
                    // After generating the QR Code, create PDF
                    that._generatePDF(qrData);
                    oQRCodeBox.setVisible(false);
                    that.onNavFirstPage();

                }.bind(this));
            }, 200);
        },

        _generatePDF: function (qrData) {
            var jsPDF = window.jspdf.jsPDF;
            //var doc = new jsPDF();
            var doc = new jsPDF('l', 'mm', [50, 25]);

            let invDate = new Date(qrData.InvoiceDate);
            let formattedInvDate = invDate.getDate().toString().padStart(2, '0') + '/' +
                (invDate.getMonth() + 1).toString().padStart(2, '0') + '/' +
                invDate.getFullYear();
            let sysDate = new Date(qrData.SystemDate);

            doc.setFont("Helvetica", 'bold');
            doc.setFontSize(4.5);
            doc.setTextColor('#000');

            doc.text(2, 5, `ASN Number: ${qrData.AsnNo}`);
            doc.text(2, 9, `Gate Entry Number: IN${qrData.AsnNo}`);
            doc.text(2, 13, `Invoice Number.: ${qrData.InvoiceNo}`);
            doc.text(2, 17, `Invoice Date: ${formattedInvDate}`);

            // Get the canvas element for the QR code
            var canvas = document.getElementById('qrCanvas');
            var imgData = canvas.toDataURL('image/png');

            // Add the QR code image to the PDF
            doc.addImage(imgData, 'PNG', 35, 1, 15, 15); // Adjust size and position as necessary
            doc.text(2, 21, `Supplier: ( ${qrData.Vendor} )`);
            // Save the PDF to a file
            doc.save(`Gate_Entry_${qrData.AsnNo}.pdf`);
        },

        




    });
});