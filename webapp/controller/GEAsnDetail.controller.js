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
            this.getView().setModel(oModel, "AsnItemsModel");
            this.f4HelpModel = this.getOwnerComponent().getModel("vendorModel");
            this.inGateEntryModel = this.getOwnerComponent().getModel("vendorModel");
            oRouter.getRoute("RouteGEAsnDetail").attachPatternMatched(this._onRouteMatched, this);

        },
        formatter:Formatter,
        _onRouteMatched: function (oEvent) {
            this.getView().getModel("AsnItemsModel").setProperty("/Results", []);
            let sAsn = oEvent.getParameter("arguments").asn;
            if (!sAsn) {
                this.onNavBack();
                return;
            }
            Models.fetchInwardGateHeaderAndItems(this,sAsn);
            
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
            let oView = this.getView();
            let Plant = oView.byId("idDropdownPlant").getValue();
            if (this.checkQuantityInputErrors()) {
                sap.m.MessageToast.show("Please correct quantity errors before saving.");
                return;
            }

            MessageBox.confirm("Are you sure you want to save this ASN?", {
                title: "Confirm Save",
                actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                emphasizedAction: MessageBox.Action.YES,
                onClose: function (oAction) {
                    if (oAction !== MessageBox.Action.YES) {
                        return; // Exit if user cancels
                    }
                    let oDateFormat = DateFormat.getInstance({
                        pattern: "yyyy-MM-dd'T'00:00:00"
                    });
                    let SystemDate = oDateFormat.format(new Date(oView.byId("idRAPO_Date").getValue())),
                        time = oView.byId("idRAPO_Time").getValue().split(":"),
                        hours = time[0].length === 1 ? ('0' + time[0]) : time[0],
                        SystemTime = `PT${hours}H${time[1]}M${time[1]}S`;

                    let InvoiceNo = that.getView().byId("idDocInvNo").getValue();
                    let InvoiceDate = oDateFormat.format(oView.byId("idRAPO_InvDate").getDateValue()),
                        Lrnumber = oView.byId("idRAPO_LR_No").getValue(),
                        Lrdate = oDateFormat.format(oView.byId("idRAPO_LR_Date").getDateValue()),
                        EwayDate = oDateFormat.format(oView.byId("idRAPO_EWAY_Date").getDateValue()),
                        Ponumber = oView.byId("idRAPO_PO_Order").getValue(),
                        Vendor = oView.byId("idSupplier").getText(),
                        Ewayno = oView.byId("idRAPO_EwayNo").getValue(),
                        Amount = oView.byId("idRAPO_Amount").getValue(),
                        Vehicleno = oView.byId("idRAPO_VehicalNo").getValue(),
                        purchaseOrder = oView.byId("idRAPO_PO_Order").getValue(),
                        Transporter = oView.byId("idRAPO_Trasporter").getValue();
                    if (InvoiceNo === "" || (!InvoiceDate) || Ponumber === "" || Ewayno === "" || Amount === "" || Vehicleno === "" || Transporter === "") {
                        MessageToast.show("Fill all mandatory fields");
                        return;
                    }
                    if (that.errorQuantity) {
                        MessageToast.show("Enter a valid Quantity");
                        return;
                    }
                    let isQuantityEntered = true;
                    var itemData = [];
                    that.getView().byId("idTable_RAPO").getModel("AsnItemsModel").getProperty("/Results").filter(item => {
                        if (!item.EnteredQuantity) {
                            isQuantityEntered = false;
                        }
                        let toPostedQuanity = parseFloat(item.postedquantity) + parseFloat(item.EnteredQuantity);

                        let obj = {
                            "Ponumber": Ponumber,
                            "LineItem": item.PurchaseOrderItem,
                            "Material": item.Material,
                            "Materialdesc": item.PurchaseOrderItemText,
                            "Quantity": parseFloat(item.OrderQuantity).toFixed(2),
                            "Postedquantity": parseFloat(toPostedQuanity).toFixed(2)
                        };
                        itemData.push(obj);
                    });
                    if (!isQuantityEntered) {
                        MessageToast.show("Enter Item Quantity");
                        return;
                    }
                    let payload = {
                        "AsnNo": "",
                        "InvoiceNo": InvoiceNo,
                        "Ponumber": purchaseOrder,
                        "Plant": Plant,
                        "SystemDate": SystemDate,
                        "SystemTime": SystemTime,
                        "InvoiceDate": InvoiceDate, //"2024-12-29T00:00:00",
                        "Lrdate": (Lrdate !== "" ? Lrdate : null), //"2024-12-29T00:00:00",
                        "Lrnumber": Lrnumber,
                        "Vendor": Vendor,
                        "Ewayno": Ewayno,
                        "EwaybillDate": (EwayDate !== "" ? EwayDate : null),
                        "Amount": parseFloat(Amount).toFixed(2),
                        "Vehicleno": Vehicleno,
                        "Transporter": Transporter,
                        "Status": "01",
                        "to_Item": itemData
                    };

                    that.getView().setBusy(true);
                    that.inGateEntryModel.create("/InwardGateHeader", payload, {
                        method: "POST",
                        success: function (oData, oResponse) {
                            that.getView().setBusy(false);
                            let qrDataToPrintQRCode = oResponse.data;
                            let qrData = oResponse.data;
                            let gateEntryNo = qrData.AsnNo;
                            console.log(oResponse);
                            let oTable = that.getView().byId("idTable_RAPO");
                            let aItems = oTable.getModel("AsnItemsModel").getProperty("/Results") || [];
                            // 3️⃣ Prepare array of POST promises
                            var dialog = new Dialog("idPrintQRDialog", {
                                title: 'Success',
                                type: 'Message',
                                state: 'Success',
                                content: new sap.m.Text({
                                    text: `ASN  ${gateEntryNo} generated successfully`
                                }),
                                beginButton: new Button({
                                    text: 'Download ASN',
                                    press: function () {
                                        that.onViewQR(qrData); //call function to download QR code
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
                            if (e.responseText && (e.statusCode === 400 || e.statusCode === "400")) {
                                var err = JSON.parse(e.responseText);
                                var msg = err.error.message.value;
                            } else if (e.responseText && (e.statusCode === 500 || e.statusCode === "500")) {
                                var parser = new DOMParser();
                                var xmlDoc = parser.parseFromString(e.responseText, "text/xml");
                                var msg = xmlDoc.documentElement.childNodes[1].innerHTML;
                            } else {
                                var msg = e.message;
                            }
                            var bCompact = !!that.getView().$().closest(".sapUiSizeCompact").length;
                            MessageBox.error(
                                msg, {
                                styleClass: bCompact ? "sapUiSizeCompact" : ""
                            }
                            );
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
                    that.clearUIFields();

                }.bind(this));
            }, 200);
        },

        _generatePDF: function (qrData) {
            var jsPDF = window.jspdf.jsPDF;
            //var doc = new jsPDF();
            var doc = new jsPDF('l', 'mm', [50, 25]);
            const supplierName = this.getOwnerComponent().getModel("RoutePoData").getProperty("/PoHeader/SupplierName");

            let invDate = new Date(qrData.InvoiceDate);
            let formattedInvDate = invDate.getDate().toString().padStart(2, '0') + '/' +
                (invDate.getMonth() + 1).toString().padStart(2, '0') + '/' +
                invDate.getFullYear();
            let sysDate = new Date(qrData.SystemDate);
            let formattedSystemDate = sysDate.getDate().toString().padStart(2, '0') + '/' +
                (sysDate.getMonth() + 1).toString().padStart(2, '0') + '/' +
                sysDate.getFullYear();

            doc.setFont("Helvetica", 'bold');
            doc.setFontSize(4.5);
            doc.setTextColor('#000');

            doc.text(2, 5, `ASN Number.: ${qrData.AsnNo}`);
            doc.text(2, 9, `Invoice Number.: ${qrData.InvoiceNo}`);
            doc.text(2, 13, `Invoice Date: ${formattedInvDate}`);

            // Get the canvas element for the QR code
            var canvas = document.getElementById('qrCanvas');
            var imgData = canvas.toDataURL('image/png');

            // Add the QR code image to the PDF
            doc.addImage(imgData, 'PNG', 35, 1, 15, 15); // Adjust size and position as necessary
            doc.text(2, 17, `Supplier: ${supplierName} ( ${qrData.Vendor} )`);
            // Save the PDF to a file
            doc.save(`ASN_${qrData.AsnNo}.pdf`);
        },

        clearUIFields: function () {
            let oView = this.getView();
            //oView.byId("idDocInvNo").setValue();
            // oView.byId("idDropdownPlant").setSelectedKey();
            // oView.byId("idDropdownPlant").setValue();
            oView.byId("idRAPO_Date").setValue();
            oView.byId("idRAPO_Time").setValue();
            oView.byId("idDocInvNo").setValue();

            oView.byId("idRAPO_InvDate").setValue();
            oView.byId("idRAPO_LR_Date").setValue();
            oView.byId("idRAPO_EWAY_Date").setValue();
            oView.byId("idRAPO_LR_No").setValue();
            // oView.byId("idRAPO_PO_Order").setValue();
            oView.byId("idRAPO_EwayNo").setValue();
            oView.byId("idRAPO_Amount").setValue();
            oView.byId("idRAPO_VehicalNo").setValue();
            oView.byId("idRAPO_Trasporter").setValue();
            let tModel = new sap.ui.model.json.JSONModel([]);
            oView.byId("idTable_RAPO").setModel(tModel);
            //oView.byId("idPanelChallan").setVisible(false);
            this.onNavFirstPage();
        },




    });
});