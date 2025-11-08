sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "hodek/gateapps/model/models",
    "hodek/gateapps/utils/Formatter",
    "sap/ui/core/format/DateFormat",
    "sap/ui/core/date/UI5Date",
    'sap/ui/model/json/JSONModel'
], (Controller, Models, Formatter, DateFormat, UI5Date, JSONModel) => {
    "use strict";
    //QR & PDF in use libraries //
    //QR & PDF in use libraries //
    jQuery.sap.require("hodek.gateapps.model.qrCode");
    jQuery.sap.require("hodek.gateapps.model.jspdf");
    jQuery.sap.require("hodek.gateapps.model.JsBarcode");
    return Controller.extend("hodek.gateapps.controller.ReprintGE", {
        onInit: function () {
            const oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("RouteGEReprint").attachPatternMatched(this._onRouteMatched, this);

            // Initialize Busy Dialog
            this.oBusyDialog = new sap.m.BusyDialog({ text: "Loading data..." });

            // Flags
            this.bUserInfoLoaded = false; // To ensure UserInfo is fetched only once
            this.bHasMoreData = true;
            this.iSkip = 0;
            this.iTop = 200; // Page size
            this.sQuery = ""; // Store current search query
            Models._loadPlants(this);
            // Initialize models
            const oAsnModelVh = new sap.ui.model.json.JSONModel();
            const oSupplierVHModel = new sap.ui.model.json.JSONModel([]);
            const oPgVHModel = new sap.ui.model.json.JSONModel([]);
            const oAsnHeaderModel = new sap.ui.model.json.JSONModel([]);

            this.getOwnerComponent().setModel(oSupplierVHModel, "SupplierVHModel");
            this.getOwnerComponent().setModel(oAsnHeaderModel, "AsnHeaderModel");
            this.getOwnerComponent().setModel(oPgVHModel, "PgVHModel");
            this.getOwnerComponent().setModel(oAsnModelVh, "AsnModelVh");
        },

        _onRouteMatched: function (oEvent) {
            const oTable = this.byId("idAsnTableCancel");
            this.iSkip = 0;
            // oTable.setBusy(true);
            this.oBusyDialog.setText("Loading Data..");
            this.oBusyDialog.open()
            // Only fetch user info once
            if (!this.bUserInfoLoaded) {
                this.bUserInfoLoaded = false; // initialize in onInit
                const that = this;
                const loginFallback = "CB9980000026";

                const getUserInfo = sap.ushell && sap.ushell.Container
                    ? sap.ushell.Container.getServiceAsync("UserInfo")
                    : Promise.resolve({ getId: () => loginFallback });

                getUserInfo.then(function (UserInfo) {
                    let loginUser = UserInfo.getId();
                    return Models.getUserInfo(that, loginUser);
                }).then((oData) => {
                    const uniqueGroups = [...new Map(oData.results.map(obj => [obj.PurchasingGroup, obj])).values()];
                    that.getOwnerComponent().getModel("PgVHModel").setData(uniqueGroups);
                    that.getOwnerComponent().getModel("SupplierVHModel").setData(oData.results);
                    console.log("UserInfo Loaded..");

                    that.bUserInfoLoaded = true;

                    // Now load Purchase Orders
                    that.loadPurchaseOrderFilter();
                }).catch((oError) => {
                    console.error("Failed to load Purchase Orders:", oError);
                });
            } else {
                // User info already loaded, just refresh table
                this.loadPurchaseOrderFilter();
            }
        },

        loadPurchaseOrderFilter: function () {
            // Load PO data and build company code model
            let _this = this;
            Models._loadAsn(this, this.sQuery, this.iSkip, this.iTop)
                .then(function (aResults) {
                    let oAsnModel = _this.getOwnerComponent().getModel("AsnHeaderModel");
                    let aExisting = oAsnModel.setProperty("/AsnData", aResults) || [];

                    // Update skip for next load
                    _this.iSkip += aResults.length;
                    _this.oBusyDialog.close();
                })
                .catch(function () {
                    _this.oBusyDialog.close();
                });
        },
        onSelectionChange: function (oEvent) {
            let oTable = this.byId("idAsnTable"); // Your table ID
            let aSelectedItems = oTable.getSelectedItems();

            let oButton = this.byId("idActionReprint"); // Your button ID
            oButton.setEnabled(aSelectedItems.length > 0);
        },
        formatter: Formatter,
        onFilterGo: function (oEvent) {
            this.iSkip = 0;
            this.iTop = 200; // page size
            this.sQuery = "onFilterGo";
            this.getOwnerComponent().getModel("AsnHeaderModel").setProperty("/AsnData", "");
            this.oBusyDialog.open();
            this.loadPurchaseOrderFilter();

        },
        onLineItemPress: function (oEvent) {
            const oSelectedItem = oEvent.getParameter("listItem"); // or getSource()
            const oContext = oSelectedItem.getBindingContext("TableModelPO");
            const oData = oContext.getObject();
            this.getOwnerComponent().getModel("RoutePoData").setProperty("/PoHeader", oData);
            // Example: Navigate to another route with PurchaseOrder as parameter
            const oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RoutePurchaseOrder", {
                po: oData.PurchaseOrder // pass any key you need
            });

            // OR: If opening a dialog or using in-place display:
            // this.getView().getModel("DetailModel").setData(oData);
        },
        onNavBack: function () {
            let oHistory = sap.ui.core.routing.History.getInstance();
            let sPreviousHash = oHistory.getPreviousHash();

            if (sPreviousHash !== undefined) {
                window.history.go(-1);
            } else {
                this.getOwnerComponent().getRouter().navTo("RouteVendorPortal", {}, true); // replace with actual route
            }
        },

        onAsnSearch: function (oEvent) {
            let sQuery = oEvent.getParameter("query").toLowerCase();
            this.sQuery = sQuery;
            this._poSkip = 0;
            this._poHasMore = true;

            const oModel = this.getView().getModel("AsnHeaderModel");
            const aAllPo = oModel.getProperty("/AsnData") || [];

            // Filter existing local data
            const aFilteredPo = aAllPo.filter(item =>
                Object.values(item).some(val =>
                    String(val).toLowerCase().includes(sQuery)
                )
            );

            if (aFilteredPo.length > 0) {
                // Use filtered data from local cache
                // this.applyDynamicFilter(oEvent.getSource().getBinding("items"), sQuery, ["AsnNo", "Plant", "InvoiceNo"]);
                this._applySearchFilter(sQuery);
            } else {
                this.iSkip = 0;
                this.iTop = 200; // page size
                this.loadPurchaseOrderFilter();
            }
        },

        applyDynamicFilter: function (oBinding, sQuery, aFieldNames) {
            let aFilters = aFieldNames.map(sField =>
                new sap.ui.model.Filter(sField, sap.ui.model.FilterOperator.Contains, sQuery)
            );

            let oCombinedFilter = new sap.ui.model.Filter({
                filters: aFilters,
                and: false
            });

            oBinding.filter([oCombinedFilter]);
        },

        onSearchAsn: function (oEvent) {
            var sQuery = oEvent.getParameter("query");
            this._applySearchFilter(sQuery);
        },

        _applySearchFilter: function (sQuery) {
            var oTable = this.byId("idAsnTable");
            var oBinding = oTable.getBinding("items");

            if (sQuery && sQuery.trim() !== "") {
                // Build OR filter for all searchable properties
                var aFilters = [
                    new sap.ui.model.Filter("AsnNo", sap.ui.model.FilterOperator.Contains, sQuery),
                    new sap.ui.model.Filter("InvoiceNo", sap.ui.model.FilterOperator.Contains, sQuery),
                    new sap.ui.model.Filter("Plant", sap.ui.model.FilterOperator.Contains, sQuery),
                ];

                var oFilter = new sap.ui.model.Filter({
                    filters: aFilters,
                    and: false // OR across all fields
                });

                // Apply search as "Application" filter so it works with other filters
                oBinding.filter([oFilter], "Application");
            } else {
                // Clear only the search filter
                oBinding.filter([], "Application");
            }
        },
        handleReprint: function () {
            let oTable = this.byId("idAsnTable"); // Replace with your table ID
            let aSelectedContexts = oTable.getSelectedContexts(); // Works for sap.m.Table

            if (aSelectedContexts.length === 0) {
                sap.m.MessageToast.show("Please select at least one row.");
                return;
            }

            let aSelectedData = aSelectedContexts.map(function (oContext) {
                return oContext.getObject(); // Gets the row's data object
            });

            // console.log("Selected Row Data:", aSelectedData);

            // // Example: You can store it in a model for later use
            // let oModel = new sap.ui.model.json.JSONModel({ selectedRows: aSelectedData });
            // this.getOwnerComponent().setModel(oModel, "SelectedRowsModel");
            this.onViewQR(aSelectedData[0]);
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
            //         // oQRCodeBox.setVisible(false);
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
                        width: 3,
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
            // Get the canvas element for the QR code
            var canvas = document.getElementById('qrCanvas');
            var imgData = canvas.toDataURL('image/png');

            doc.addImage(imgData, 'PNG', 5, 1, 35, 10); // Adjust size and position as necessary
            doc.text(2, 12, `ASN Number: ${qrData.AsnNo} |`);
            doc.text(23, 12, `Gate Entry No: IN${qrData.AsnNo}`);
            doc.text(2, 15, `Invoice Number: ${qrData.InvoiceNo}`);
            doc.text(2, 18, `Invoice Date: ${formattedInvDate}`);
            // doc.text(2, 21, `Supplier: ${qrData.SupplierName} ( ${qrData.Vendor} )`);
            let vendorText = `Supplier: ${qrData.SupplierName} ( ${qrData.Vendor} )`;
            let wrappedVendor = doc.splitTextToSize(vendorText, 42);
            doc.text(wrappedVendor, 2, 21, { maxWidth: 42, lineHeightFactor: 1.2 });
            // Save the PDF to a file
            doc.save(`Gate_Entry_${qrData.AsnNo}.pdf`);
        },
        onUpdateStartPoHeaderTable: function (oEvent) {
            // Skip first automatic trigger
            if (!this.bFirstLoadDone) {
                this.bFirstLoadDone = true;
                return;
            }

            // Check if it's really a scroll (reason = Growing)
            if (oEvent.getParameter("reason") === "Growing" && this.bHasMoreData) {
                this.loadMoreData();
            }
        },
        loadMoreData: function () {
            let _this = this;
            this.oBusyDialog.setText("Loading more data...");
            this.oBusyDialog.open();

            Models._loadAsn(this, this.sQuery, this.iSkip, this.iTop)
                .then(function (aResults) {
                    let oAsnModel = _this.getOwnerComponent().getModel("AsnHeaderModel");
                    let aExisting = oAsnModel.getProperty("/AsnData") || [];

                    oAsnModel.setProperty("/AsnData", aExisting.concat(aResults));

                    _this.iSkip += aResults.length;
                    if (aResults.length < _this.iTop) {
                        _this.bHasMoreData = false;
                    }
                    _this.oBusyDialog.close();
                })
                .catch(function () {
                    _this.oBusyDialog.close();
                });
        },



    });
});