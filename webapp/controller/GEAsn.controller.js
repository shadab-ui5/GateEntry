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
            oRouter.getRoute("RouteGEAsn").attachPatternMatched(this._onRouteMatched, this);

        },
        _onRouteMatched: function (oEvent) {

        },
        callDetailScreen: function (asn) {
            const oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteGEAsnDetail", { asn: asn });
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
            var oInput = this.byId("idAsnInput");
            if (oInput) {
                oInput.focus();
            }
        },
        onAsnLiveChange: function (oEvent) {
            const sValue = oEvent.getParameter("value");

            // Check if 10 characters entered
            if (sValue.length === 10) {
                console.log("10-digit ASN entered:", sValue);

                this.callDetailScreen(sValue);

            }
        }



    });
});