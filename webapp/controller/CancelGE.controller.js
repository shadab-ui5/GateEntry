sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "hodek/gateapps/model/models",
    "hodek/gateapps/utils/Formatter",
    "sap/ui/core/format/DateFormat",
    "sap/ui/core/date/UI5Date",
    'sap/ui/model/json/JSONModel',
    "sap/m/MessageBox"
], (Controller, Models, Formatter, DateFormat, UI5Date, JSONModel, MessageBox) => {
    "use strict";
    //QR & PDF in use libraries //
    //QR & PDF in use libraries //
    jQuery.sap.require("hodek.gateapps.model.qrCode");
    jQuery.sap.require("hodek.gateapps.model.jspdf");
    return Controller.extend("hodek.gateapps.controller.CancelGE", {
        onInit: function () {
            const oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("RouteCancelGE").attachPatternMatched(this._onRouteMatched, this);

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

            Models._cancelGateEntry(this, this.sQuery, this.iSkip, this.iTop)
                .then(function (aResults) {
                    let oAsnModel = _this.getOwnerComponent().getModel("AsnHeaderModel");
                    let aExisting = oAsnModel.setProperty("/AsnData", aResults) || [];

                    // // Append instead of overwrite
                    // oAsnModel.setProperty("/AsnData", aExisting.concat(aResults));

                    // // Update skip for next load
                    _this.iSkip += aResults.length;
                    _this.oBusyDialog.close();
                })
                .catch(function () {

                    _this.oBusyDialog.close();
                });
        },
        onSelectionChange: function (oEvent) {
            let oTable = this.byId("idAsnTableCancel"); // Your table ID
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
        /////////////
        onSupplierValueHelp: function () {
            let oView = this.getView();

            if (!this._oSupplierDialog) {
                this._oSupplierDialog = sap.ui.xmlfragment("hodek.gateapps.fragments.SupplierValueHelp", this);
                oView.addDependent(this._oSupplierDialog);
            }

            // Set model from previously loaded one
            this._oSupplierDialog.setModel(oView.getModel("SupplierVHModel"));
            this._oSupplierDialog.open();
        },

        onSupplierSearch: function (oEvent) {
            let sQuery = oEvent.getParameter("value")?.trim().toLowerCase();
            let aFilters = [
                new sap.ui.model.Filter("Supplier", sap.ui.model.FilterOperator.Contains, sQuery),
                new sap.ui.model.Filter("Suppliername", sap.ui.model.FilterOperator.Contains, sQuery),
                new sap.ui.model.Filter("PurchasingGroup", sap.ui.model.FilterOperator.Contains, sQuery),
                new sap.ui.model.Filter("PurchasingGrpName", sap.ui.model.FilterOperator.Contains, sQuery)
            ];
            const oModel = this.getView().getModel("SupplierVHModel");
            const aAllPo = oModel.getData() || [];
            const aFilteredPo = aAllPo.filter(item =>
                Object.values(item).some(val =>
                    String(val).toLowerCase().includes(sQuery)
                )
            );

            if (aFilteredPo.length > 0) {
                // Use filtered data from local cache
                this.applyDynamicFilter(oEvent.getSource().getBinding("items"), sQuery, ["Suppliername", "PurchasingGroup", "PurchasingGrpName", "Supplier"]);

            } else {
                let oBinding = oEvent.getSource().getBinding("items");
                oBinding.filter(new sap.ui.model.Filter(aFilters, false));
            }
        },

        onSupplierConfirm: function (oEvent) {
            let aSelectedContexts = oEvent.getParameter("selectedContexts");
            let oMultiInput = this.byId("idPoSupplier");
            oMultiInput.removeAllTokens();

            if (aSelectedContexts && aSelectedContexts.length) {
                aSelectedContexts.forEach(function (oContext) {
                    let oData = oContext.getObject();
                    oMultiInput.addToken(new sap.m.Token({
                        key: oData.Supplier,
                        text: oData.Supplier + " - " + oData.Suppliername
                    }));
                });
            }
        },
        onAsnValueHelp: function () {
            let oView = this.getView();

            if (!this._oPoDialog) {
                this._oPoDialog = sap.ui.xmlfragment("hodek.gateapps.fragments.AsnValueHelp", this);
                oView.addDependent(this._oPoDialog);
            }
            this._oPoDialog.open();

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
            var oTable = this.byId("idAsnTableCancel");
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

        handleCancel: function (oEvent) {
            let oTable = this.byId("idAsnTableCancel");
            let aSelected = oTable.getSelectedItems();

            if (aSelected.length === 0) {
                sap.m.MessageToast.show("Please select at least one ASN.");
                return;
            }

            // For simplicity, take the first selected ASN
            let oSelectedData = aSelected[0].getBindingContext("AsnHeaderModel").getObject();
            let sAsnNumber = oSelectedData.AsnNo;

            // Set model data
            let oDialogModel = new sap.ui.model.json.JSONModel({
                SelectedASN: sAsnNumber,
                Remark: "",
                Sourceappvp: oSelectedData.Sourceappvp,
            });
            this.getView().setModel(oDialogModel);

            if (!this.pRemarkDialog) {
                this.pRemarkDialog = sap.ui.xmlfragment(
                    this.getView().getId(),
                    "hodek.gateapps.fragments.AsnCancelRemark",
                    this
                );
                this.getView().addDependent(this.pRemarkDialog);
            }
            this.pRemarkDialog.open();
        },

        onSubmitRemark: function () {
            let oData = this.getView().getModel().getData();
            if (!oData.Remark.trim()) {
                sap.m.MessageToast.show("Please enter a remark.");
                return;
            }
            let that = this;
            // Show confirmation dialog
            MessageBox.confirm(`Are you sure to Cancel ASN No : ${oData.SelectedASN} ?`, {
                title: "Confirm Cancellation",
                actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.NO],
                emphasizedAction: sap.m.MessageBox.Action.YES,
                onClose: function (sAction) {
                    if (sAction === sap.m.MessageBox.Action.YES) {
                        this.pRemarkDialog.setBusy(true);

                        // Call your backend method
                        Models.updateAsnStatus(this, oData.SelectedASN, oData.Remark, oData.Sourceappvp, this.pRemarkDialog);

                        this.pRemarkDialog.close();
                    }
                }.bind(this) // bind 'this' to access controller context
            });

        },

        onCancelRemark: function () {
            this.pRemarkDialog.close();
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

            Models._cancelGateEntry(this, this.sQuery, this.iSkip, this.iTop)
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