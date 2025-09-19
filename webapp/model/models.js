sap.ui.define([
    "sap/ui/model/json/JSONModel",
    "sap/ui/Device",
    "hodek/gateapps/utils/Formatter",
    "sap/ui/core/format/DateFormat",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
],
    function (JSONModel, Device, Formatter, DateFormat, MessageToast, MessageBox) {
        "use strict";

        return {
            /**
             * Provides runtime information for the device the UI5 app is running on as a JSONModel.
             * @returns {sap.ui.model.json.JSONModel} The device model.
             */
            createDeviceModel: function () {
                var oModel = new JSONModel(Device);
                oModel.setDefaultBindingMode("OneWay");
                return oModel;
            },
            initGlobalModels: function (_this) {
                const oSupplierVHModel = new sap.ui.model.json.JSONModel([]);
                const oPgVHModel = new sap.ui.model.json.JSONModel([]);
                _this.getOwnerComponent().setModel(oPgVHModel, "PgVHModel");
                _this.getOwnerComponent().setModel(oSupplierVHModel, "SupplierVHModel");
            },
            getUserInfo: function (_this, sUserid) {
                return new Promise((resolve, reject) => {
                    const oModel = _this.getOwnerComponent().getModel("vendorModel"); // assuming default model

                    oModel.read("/supplierListByUser", {
                        filters: [
                            new sap.ui.model.Filter("Userid", sap.ui.model.FilterOperator.EQ, sUserid)
                        ],
                        success: function (oData) {
                            console.log("Fetched supplier list:", oData.results);

                            resolve(oData);
                        },
                        error: function (oError) {
                            console.error("Error fetching supplier list", oError);
                            reject(oError)
                        }
                    });
                })

            },
            _loadAsn: function (_this, sQuery, iSkip, iTop) {
                return new Promise((resolve, reject) => {
                    let oStartDateFormat = DateFormat.getInstance({
                        pattern: "yyyy-MM-dd"
                    });
                    let oEndDateFormat = DateFormat.getInstance({
                        pattern: "yyyy-MM-dd"
                    });
                    let oModel = _this.getOwnerComponent().getModel("vendorModel");
                    let oSupplierVHModel = _this.getOwnerComponent().getModel("SupplierVHModel").getData();
                    const uniqueSupplier = [...new Set(oSupplierVHModel.map(obj => obj.Supplier))];

                    console.log("Unique Suppliers:", uniqueSupplier)
                    // let aFilters = [new sap.ui.model.Filter("CreatedByUser", "EQ", sUser)];
                    let aFilters = [];
                    aFilters.push(new sap.ui.model.Filter("Status", sap.ui.model.FilterOperator.EQ, '03'));
                    if (sQuery === "onFilterGo") {
                        // Get field values from the view
                        let asnFieldValue = _this.byId("asnField").getValue();
                        let geFieldValue = _this.byId("geField").getValue();
                        let invoiceFieldValue = _this.byId("invoiceField").getValue();
                        let oDateRange = _this.byId("idprintPurchDate").getDateValue();
                        let oDateRangeTo = _this.byId("idprintPurchDate").getSecondDateValue();

                        // Add ASN filter if value is provided
                        if (asnFieldValue) {
                            aFilters.push(new sap.ui.model.Filter("AsnNo", "Contains", asnFieldValue));
                        }
                        if (geFieldValue) {
                            aFilters.push(new sap.ui.model.Filter("GateEntryId", "Contains", geFieldValue));
                        }
                        // Add Invoice No filter if value is provided
                        if (invoiceFieldValue) {
                            aFilters.push(new sap.ui.model.Filter("InvoiceNo", "Contains", invoiceFieldValue));
                        }
                        // Add Invoice Date range filter if both dates are selected
                        if (oDateRange && oDateRangeTo) {
                            const fromDate = oStartDateFormat.format(new Date(oDateRange)); // "2025-08-07"
                            const toDate = oEndDateFormat.format(new Date(oDateRangeTo));     // "2025-08-08"
                            aFilters.push(new sap.ui.model.Filter("InvoiceDate", sap.ui.model.FilterOperator.BT, fromDate, toDate));
                        }
                    } else if (sQuery) {
                        let oSearch = new sap.ui.model.Filter({
                            filters: [
                                new sap.ui.model.Filter("AsnNo", "Contains", sQuery),
                                new sap.ui.model.Filter("InvoiceNo", "Contains", sQuery),
                                new sap.ui.model.Filter("Plant", "Contains", sQuery),
                                new sap.ui.model.Filter("Vendor", "Contains", sQuery),
                            ],
                            and: false
                        });
                        aFilters.push(oSearch);
                    }
                    // const oOrFilter = new sap.ui.model.Filter(
                    //     uniqueSupplier.map(group =>
                    //         new sap.ui.model.Filter("Vendor", sap.ui.model.FilterOperator.EQ, group)
                    //     ),
                    //     false // OR
                    // );
                    // aFilters.push(oOrFilter);


                    oModel.read("/gateEntryReprint", {
                        filters: aFilters,
                        urlParameters: {
                            "$top": iTop,
                            "$skip": iSkip,
                            "$orderby": "AsnNo desc",
                        },
                        success: (oData) => {

                            resolve(oData.results)

                        },
                        error: (err) => {
                            sap.m.MessageToast.show("Error fetching Purchase Orders.");
                            console.log(err)
                            reject(err)
                        }
                    });
                })
            },
            _cancelGateEntry: function (_this, sQuery, iSkip, iTop) {
                return new Promise((resolve, reject) => {
                    let oStartDateFormat = DateFormat.getInstance({
                        pattern: "yyyy-MM-dd"
                    });
                    let oEndDateFormat = DateFormat.getInstance({
                        pattern: "yyyy-MM-dd"
                    });
                    let oModel = _this.getOwnerComponent().getModel("vendorModel");
                    let oSupplierVHModel = _this.getOwnerComponent().getModel("SupplierVHModel").getData();
                    const uniqueSupplier = [...new Set(oSupplierVHModel.map(obj => obj.Supplier))];

                    console.log("Unique Suppliers:", uniqueSupplier)
                    // let aFilters = [new sap.ui.model.Filter("CreatedByUser", "EQ", sUser)];
                    let aFilters = [];
                    // aFilters.push(new sap.ui.model.Filter("Status", sap.ui.model.FilterOperator.EQ, '03'));
                    if (sQuery === "onFilterGo") {
                        // Get field values from the view
                        let asnFieldValue = _this.byId("asnField").getValue();
                        let geFieldValue = _this.byId("geField").getValue();
                        let invoiceFieldValue = _this.byId("invoiceField").getValue();
                        let oDateRange = _this.byId("idprintPurchDate").getDateValue();
                        let oDateRangeTo = _this.byId("idprintPurchDate").getSecondDateValue();

                        // Add ASN filter if value is provided
                        if (asnFieldValue) {
                            aFilters.push(new sap.ui.model.Filter("AsnNo", "Contains", asnFieldValue));
                        }
                        if (geFieldValue) {
                            aFilters.push(new sap.ui.model.Filter("GateEntryId", "Contains", geFieldValue));
                        }
                        // Add Invoice No filter if value is provided
                        if (invoiceFieldValue) {
                            aFilters.push(new sap.ui.model.Filter("InvoiceNo", "Contains", invoiceFieldValue));
                        }
                        // Add Invoice Date range filter if both dates are selected
                        if (oDateRange && oDateRangeTo) {
                            const fromDate = oStartDateFormat.format(new Date(oDateRange)); // "2025-08-07"
                            const toDate = oEndDateFormat.format(new Date(oDateRangeTo));     // "2025-08-08"
                            aFilters.push(new sap.ui.model.Filter("InvoiceDate", sap.ui.model.FilterOperator.BT, fromDate, toDate));
                        }
                    } else if (sQuery) {
                        let oSearch = new sap.ui.model.Filter({
                            filters: [
                                new sap.ui.model.Filter("AsnNo", "Contains", sQuery),
                                new sap.ui.model.Filter("InvoiceNo", "Contains", sQuery),
                                new sap.ui.model.Filter("Plant", "Contains", sQuery),
                                new sap.ui.model.Filter("Vendor", "Contains", sQuery),
                            ],
                            and: false
                        });
                        aFilters.push(oSearch);
                    }
                    // const oOrFilter = new sap.ui.model.Filter(
                    //     uniqueSupplier.map(group =>
                    //         new sap.ui.model.Filter("Vendor", sap.ui.model.FilterOperator.EQ, group)
                    //     ),
                    //     false // OR
                    // );
                    // aFilters.push(oOrFilter);


                    oModel.read("/gateEntryCancel", {
                        filters: aFilters,
                        urlParameters: {
                            "$top": iTop,
                            "$skip": iSkip,
                            "$orderby": "AsnNo desc",
                        },
                        success: (oData) => {

                            resolve(oData.results)

                        },
                        error: (err) => {
                            sap.m.MessageToast.show("Error fetching Purchase Orders.");
                            console.log(err)
                            reject(err)
                        }
                    });
                })
            },
            updateAsnStatus: function (_this, sAsnNo, Remark, oDialog) {
                let oModel = _this.getOwnerComponent().getModel("vendorModel"); // Your OData model

                // Build the path to the entity — make sure ASN is zero-padded exactly as backend expects
                let sPath = `/InwardGateHeader('${sAsnNo}')`;

                let oPayload = {
                    Status: "01", // Field to update
                    Remarks: Remark
                };

                oModel.update(sPath, oPayload, {
                    success: function () {
                        sap.m.MessageToast.show(`Gate Entry cancelled Successfully for ASN: ${sAsnNo}`);

                        _this.iSkip = 0;
                        _this.iTop = 20; // page size
                        _this.sQuery = ""
                        _this.getOwnerComponent().getModel("AsnHeaderModel").setProperty("/AsnData", "");
                        _this.loadPurchaseOrderFilter()
                        oDialog.setBusy(false);
                        oDialog.close();
                    },
                    error: function (oError) {
                        sap.m.MessageBox.error("Failed to update ASN status.\n" + oError.message);
                        oDialog.setBusy(false);
                    }
                });
            },
            fetchInwardGateHeaderAndItems: function (_this, asnNo) {
                return new Promise((resolve, reject) => {
                    const oModel = _this.getOwnerComponent().getModel("vendorModel");
                    const sPath = `/InwardGateHeader('${asnNo}')`;

                    oModel.read(sPath, {
                        urlParameters: { "$expand": "to_Item" },
                        success: function (oData) {
                            console.log("Header and Items:", oData);

                            // Set models for the view
                            const headerData = oData;
                            const itemsData = oData.to_Item.results;

                            const oView = _this.getView();
                            oView.getModel("AsnHeaderModel").setData(headerData);
                            oView.getModel("AsnItemsModel").setData(itemsData);

                            resolve(headerData); // ✅ return header data to caller
                        },
                        error: function (oError) {
                            reject(oError);
                        }
                    });
                });
            },
            updateGateEntryId: function (_this, asnNo, newGateEntryId) {
                const oModel = _this.getOwnerComponent().getModel("vendorModel");

                // Path to the specific InwardGateHeader entity
                const sPath = `/InwardGateHeader('${asnNo}')`;

                // Only sending the field to update
                const oPayload = {
                    GateEntryId: newGateEntryId,
                    Status: '03'
                };

                oModel.update(sPath, oPayload, {
                    success: function () {
                        // MessageToast.show("Gate Entry ID updated successfully.");
                    },
                    error: function (oError) {
                        console.error("Failed to update Gate Entry ID:", oError);
                        MessageBox.error("Error updating Gate Entry ID. Please try again.");
                    }
                });
            },

            _loadPlants: function (_this, sQuery, iSkip, iTop, fnCallback) {
                let oModel = _this.getOwnerComponent().getModel("vendorModel");

                let sUser = sap.ushell?.Container?.getUser().getId() || "CB9980000018";
                // let aFilters = [new sap.ui.model.Filter("CreatedByUser", "EQ", sUser)];
                let aFilters = [];

                if (sQuery) {
                    let oSearch = new sap.ui.model.Filter({
                        filters: [
                            new sap.ui.model.Filter("Plant", "Contains", sQuery),
                            new sap.ui.model.Filter("PlantName", "Contains", sQuery)
                        ],
                        and: false
                    });
                    aFilters.push(oSearch);
                }

                oModel.read("/plantVh", {
                    filters: aFilters,
                    urlParameters: {
                        "$top": iTop,
                        "$skip": iSkip
                    },
                    success: (oData) => {
                        fnCallback(oData);
                    },
                    error: () => {
                        sap.m.MessageToast.show("Error fetching Plants.");
                    }
                });
            },

        };

    });