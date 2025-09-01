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
    return Controller.extend("hodek.gateapps.controller.GEAsn", {
        onInit() {
            const oRouter = this.getOwnerComponent().getRouter();

            // this.byId("idRAII_InvDate").setMaxDate(new Date);
            // this.byId("idRAII_LR_Date").setMaxDate(new Date);

            this.f4HelpModel = this.getOwnerComponent().getModel("vendorModel");
            //new sap.ui.model.odata.v2.ODataModel("https://my420245.s4hana.cloud.sap/sap/opu/odata/sap/ZSB_INWARDGATEENTRY/");
            //var odataModel = new sap.ui.model.odata.ODataModel("https://my420245.s4hana.cloud.sap/sap/opu/odata/sap/ZSB_INWARDGATEENTRY/"",{user:shadab.hussain@techorbitgroup.com,password:Abap4Ever});
            this.inGateEntryModel = this.getOwnerComponent().getModel("vendorModel");
            //https://my420225-api.s4hana.cloud.sap/sap/opu/odata/sap/YY1_CHALLANNOF4HELP_CDS/YY1_ChallanNoF4Help?$format=json

            /*this.challanModel = new sap.ui.model.odata.ODataModel(`https://${systemHost}-api.s4hana.cloud.sap/sap/opu/odata/sap/YY1_CHALLANNOF4HELP_CDS/`, {
                json: true,
                user: sUser,
                password: sPwd
            });*/

            setTimeout(function () {
                // that.getPlantData();
                // that.getTransporter();
            }, 300);

            /*this.byId("idInpRAPOItemQuantity").onChange(function(oEvent) {
                var itemQuantity = oEvent.getSource().getValue();
                if(itemQuantity === "") {
                    return;
                }
                that.calculateMaxAmoutValue_RAPO(itemQuantity);
            });*/
            const oModel = new sap.ui.model.json.JSONModel([]);
            const oModelHeader = new sap.ui.model.json.JSONModel([]);
            this.getOwnerComponent().setModel(oModel, "AsnItemsModel");
            this.getOwnerComponent().setModel(oModelHeader, "AsnHeaderModel");
            oRouter.getRoute("RouteGEAsn").attachPatternMatched(this._onRouteMatched, this);

        },
        _onRouteMatched: function (oEvent) {
            let oInput = this.byId("idAsnInput");
            oInput.setValue("")
            if (oInput) {
                oInput.focus();
            }
        },
        callDetailScreen: function (asn) {
            if (asn) {
                this.getView().setBusy(true);

                Models.fetchInwardGateHeaderAndItems(this, asn)
                    .then((headerData) => {
                        // ✅ Only navigate if Status === "01"
                        if (headerData.Status === "01") {
                            const oRouter = this.getOwnerComponent().getRouter();
                            oRouter.navTo("RouteGEAsnDetail", { asn: asn });
                        } else if (headerData.Status === "02") {
                            sap.m.MessageToast.show(`This ASN ${asn} is cancelled`);
                        } else {
                            sap.m.MessageToast.show("Gate Entry Already Created");
                        }
                    })
                    .catch((err) => {
                        console.error("Error fetching ASN:", err);
                        sap.m.MessageToast.show("Failed to fetch ASN details");
                    })
                    .finally(() => {
                        this.getView().setBusy(false);
                    });
            }
        },
        onNavBack: function () {
            var oHistory = sap.ui.core.routing.History.getInstance();
            var sPreviousHash = oHistory.getPreviousHash();

            if (sPreviousHash !== undefined) {
                window.history.go(-1);
            } else {
                this.getOwnerComponent().getRouter().navTo("RouteGEAsn", {
                }, true); // replace with actual route
            }
        },
        onAfterRendering: function () {
            let oInput = this.byId("idAsnInput");
            oInput.setValue("")
            if (oInput) {
                oInput.focus();
            }
        },
        onAsnLiveChange: function (oEvent) {
            const sValue = oEvent.getParameter("newValue");

            // Check if 10 characters entered
            if (sValue.length === 10) {
                console.log("10-digit ASN entered:", sValue);

                this.callDetailScreen(sValue);

            }
        },
        onSubmitPress: function (oEvent) {
            const sValue = this.getView().byId('idAsnInput').getValue();

            // Check if 10 characters entered
            if (sValue.length === 10) {
                console.log("10-digit ASN entered:", sValue);

                this.callDetailScreen(sValue);
            } else {
                sap.m.MessageToast.show("Enter 10 digit ASN Number")
            }
        }




    });
});