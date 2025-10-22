sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/core/Fragment",
    "sap/m/library",
    'sap/ui/core/library',
    "sap/ui/core/format/DateFormat",
    "hodek/gateapps/model/models"
], (Controller, Dialog, Button, MessageBox, MessageToast, Fragment, mobileLibrary, coreLibrary, DateFormat, Models) => {
    "use strict";
    //jQuery.sap.require("hodek.gateapps.model.qrcode");

    //QR & PDF in use libraries //
    jQuery.sap.require("hodek.gateapps.model.qrCode");
    jQuery.sap.require("hodek.gateapps.model.jspdf");
    jQuery.sap.require("hodek.gateapps.model.JsBarcode");
    //END

    //jQuery.sap.require("hodek.gateapps.model.qrcodeNew");
    //jQuery.sap.require("hodek.gateapps.model.jspdfNew");

    let ValueState = coreLibrary.ValueState;
    //let dateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "YYYY/MM/DD" });
    let ButtonType = mobileLibrary.ButtonType;
    //var DialogType = mobileLibrary.DialogType;

    return Controller.extend("hodek.gateapps.controller.GEposa", {
        onInit() {
            this.oParameters = {
                "$top": 200000
            };
            let that = this;
            const oRouter = this.getOwnerComponent().getRouter();
            this.selectedPOSchAggrVendor = "";
            this.selected_Po_Scheduling_Type = undefined;
            this.selected_Po_Scheduling_Value = undefined;
            this.aPurchaseOrdersData = [];
            this.aUniquePurchaseOrders = [];
            this.aSchAggrementData = [];
            this.aUniqueSchAggrements = [];
            this.aTransporterList = [];
            this.aVendorData = [];
            this.aUniqueVendor = [];
            this.aMaterialData = [];
            this.aUniqueMaterial = [];
            let currentYear = new Date().getFullYear();
            let currentMonth = new Date().getMonth();
            if (currentMonth < 3) {
                currentYear = currentYear - 1;
            }
            this.byId("idFiscalYear").setValue(currentYear);
            let tDate = new Date();
            let oDateFormat = DateFormat.getInstance({
                pattern: "yyyy-MM-dd"
            });
            let formattedDate = oDateFormat.format(tDate); //`${tDate.getFullYear()}/${String(tDate.getMonth() + 1).padStart(2, '0')}/${String(tDate.getDate()).padStart(2, '0')}`;
            this.byId("idRAPO_Date").setValue(formattedDate);
            let currentTime = `${tDate.getHours()}:${tDate.getMinutes()}:${tDate.getSeconds()}`;
            this.byId("idRAPO_Time").setValue(currentTime);
            this.byId("idRAPO_InvDate").setMaxDate(new Date);
            this.byId("idRAPO_LR_Date").setMaxDate(new Date);
            this.f4HelpModel = this.getOwnerComponent().getModel("vendorModel");
            this.inGateEntryModel = this.getOwnerComponent().getModel("vendorModel");
            Models._loadPlants(this);
            // that.getPlantData();
            oRouter.getRoute("RouteGEWasn").attachPatternMatched(this._onRouteMatched, this);
        },
        _onRouteMatched: function () {
            let tDate = new Date();
            let oDateFormat = DateFormat.getInstance({
                pattern: "yyyy-MM-dd"
            });
            let formattedDate = oDateFormat.format(tDate); //`${tDate.getFullYear()}/${String(tDate.getMonth() + 1).padStart(2, '0')}/${String(tDate.getDate()).padStart(2, '0')}`;
            this.byId("idRAPO_Date").setValue(formattedDate);
            let currentTime = `${tDate.getHours()}:${tDate.getMinutes()}:${tDate.getSeconds()}`;
            this.byId("idRAPO_Time").setValue(currentTime);
        },
        onRAPOInvoiceDateChange: function (oEvent) {
            var oDatePicker = oEvent.getSource();
            var sValue = oDatePicker.getValue();
            var oDate = oDatePicker.getDateValue();
            var today = new Date();

            // Remove time from today
            today.setHours(0, 0, 0, 0);

            if (!oDate || oDate > today) {
                // Invalid date or future date
                oDatePicker.setValue(""); // Clear the value
                oDatePicker.setValueState("Error");
                oDatePicker.setValueStateText("Invalid or future dates are not allowed.");
            } else {
                oDatePicker.setValueState("None"); // Clear error state
            }
        },

        onChangeDocInvNo: function (oEvent) {
            let oInput = oEvent.getSource();
            let sValue = oInput.getValue();
            if (sValue === "") {
                return;
            }
            let selectedPO = this.getView().byId("idRAPO_PO_Order").getValue();
            if (selectedPO === "") {
                oInput.setValue();
                MessageToast.show("Select Purchase Order or Scheduling Aggrement");
                return;
            }
            let selectedPOs_vendor = this.selectedPOSchAggrVendor;
            var aFinalFilter = new sap.ui.model.Filter({
                filters: [
                    new sap.ui.model.Filter("InvoiceNo", sap.ui.model.FilterOperator.EQ, sValue),
                    new sap.ui.model.Filter("Vendor", sap.ui.model.FilterOperator.EQ, selectedPOs_vendor),

                ],
                and: true
            });
            /*var filter1 = new sap.ui.model.Filter({
                path: "InvoiceNo",
                operator: sap.ui.model.FilterOperator.EQ,
                value1: sValue
            });*/

            this.f4HelpModel.read("/validateGateEntryInvoice", {
                //filters: [filter1],
                filters: [aFinalFilter],
                success: function (oResponse) {
                    if (oResponse.results.length > 0) {
                        MessageBox.alert(`Invoice No. ${sValue} is already created`);
                        oInput.setValue();
                    }
                },
                error: function (oError) {
                    oInput.setValue();
                    MessageBox.error("Failed to validate the entered Invoice No.");
                    console.log(oError);
                }
            });
        },



        onSelectPlant: function (oEvent) {
            this.getView().setBusy(true);
            let oValidatedComboBox = oEvent.getSource(),
                sSelectedKey = oValidatedComboBox.getSelectedKey(),
                sValue = oValidatedComboBox.getValue();

            if (!sSelectedKey && sValue) {
                oValidatedComboBox.setValueState(ValueState.Error);
                oValidatedComboBox.setValueStateText("Invalid Value");
                this.getView().setBusy(false);
                return;
            }

            oValidatedComboBox.setValueState(ValueState.None);

            this.clearFieldsOnClearPlant();

            let that = this;
            Promise.all([
                this.getPurchaseOrders(sSelectedKey),
                this.getSchAggrement(sSelectedKey)
            ]).then(function () {
                that.getView().setBusy(false);
                // Optionally enable PO field or trigger Value Help if needed
                // e.g., open fragment automatically or just enable the field
                // that._openPOValueHelp(); // <-- if needed
            }).catch(function (oError) {
                that.getView().setBusy(false);
                // Log or handle error if needed
                console.error("Error loading plant data:", oError);
            });
        }
        ,

        clearFieldsOnClearPlant: function () {
            let oView = this.getView();
            this.selectedPOSchAggrVendor = "";
            this.selected_Po_Scheduling_Type = undefined;
            this.selected_Po_Scheduling_Value = undefined;
            this.maxRAPOAmountAllowed = undefined;
            oView.byId("idRAPO_PO_Order").setValue();
            oView.byId("idDocInvNo").setValue();
            let tModel = new sap.ui.model.json.JSONModel([]);
            oView.byId("idTable_RAPO").setModel(tModel);
            oView.byId("idTable_RAPO").getModel().refresh();

            //reset Amount field value state for RAPO
            let amountInput = this.getView().byId("idRAPO_Amount");
            amountInput.setValueState(sap.ui.core.ValueState.None);

        },


        getPlantData: function () {
            let that = this;
            let plantModel = new sap.ui.model.json.JSONModel();
            //let odataModel = new sap.ui.model.odata.v2.ODataModel("NorthwindService/V2/(S(jjlmjbf1oszuuecc251trygy))/OData/OData.svc");
            this.f4HelpModel.read("/plantVh", {
                urlParameters: that.oParameters,
                success: function (oResponse) {
                    //MessageBox.success("Success");
                    plantModel.setData(oResponse.results);
                    that.getView().byId("idDropdownPlant").setModel(plantModel);
                },
                error: function (oError) {
                    MessageBox.error("Failed to load plant list");
                }
            });
        },

        getPurchaseOrders: function (sPlant) {
            let that = this;
            that.loadedPO = false;
            that.aPurchaseOrdersData = [];
            that.aUniquePurchaseOrders = [];

            return new Promise(function (resolve, reject) {
                let filter = new sap.ui.model.Filter({
                    path: "Plant",
                    operator: sap.ui.model.FilterOperator.EQ,
                    value1: sPlant
                });

                that.f4HelpModel.read("/ItemforPo", {
                    filters: [filter],
                    urlParameters: that.oParameters,
                    success: function (oResponse) {
                        that.aPurchaseOrdersData = oResponse.results;
                        const key = 'PurchaseOrder';
                        that.aUniquePurchaseOrders = [...new Map(oResponse.results.map(item =>
                            [item[key], item])).values()];
                        that.loadedPO = true;
                        resolve(); // resolve the Promise
                    },
                    error: function (oError) {
                        MessageBox.error("Failed to load PO Data");
                        console.log(oError);
                        reject(oError); // reject the Promise
                    }
                });
            });
        },


        getSchAggrement: function (sPlant) {
            let that = this;
            that.loadedSch = false;
            that.aSchAggrementData = [];
            that.aUniqueSchAggrements = [];

            return new Promise(function (resolve, reject) {
                let filter = new sap.ui.model.Filter({
                    path: "Plant",
                    operator: sap.ui.model.FilterOperator.EQ,
                    value1: sPlant
                });

                that.f4HelpModel.read("/ItemforSchAgr", {
                    filters: [filter],
                    urlParameters: that.oParameters,
                    success: function (oResponse) {
                        that.aSchAggrementData = oResponse.results;
                        const key = 'SchedulingAgreement';
                        that.aUniqueSchAggrements = [...new Map(oResponse.results.map(item =>
                            [item[key], item])).values()];
                        that.loadedSch = true;
                        resolve();
                    },
                    error: function (oError) {
                        MessageBox.error("Failed to load Scheduling Agreement Data");
                        console.log(oError);
                        reject(oError);
                    }
                });
            });
        },

        // getPurchaseOrders: function (sPlant, aExtraFilters = []) {
        //     let that = this;
        //     that.loadedPO = false;
        //     that.aPurchaseOrdersData = [];
        //     that.aUniquePurchaseOrders = [];

        //     return new Promise(function (resolve, reject) {
        //         // Base filter by Plant (always included if sPlant is provided)
        //         let aFilters = [];
        //         if (sPlant) {
        //             aFilters.push(new sap.ui.model.Filter("Plant", sap.ui.model.FilterOperator.EQ, sPlant));
        //         }

        //         // Add extra filters if passed
        //         if (aExtraFilters && aExtraFilters.length) {
        //             aFilters = aFilters.concat(aExtraFilters);
        //         }

        //         that.f4HelpModel.read("/ItemforPo", {
        //             filters: aFilters,
        //             urlParameters: that.oParameters,
        //             success: function (oResponse) {
        //                 that.aPurchaseOrdersData = oResponse.results;

        //                 // Keep unique by PurchaseOrder
        //                 const key = 'PurchaseOrder';
        //                 that.aUniquePurchaseOrders = [
        //                     ...new Map(oResponse.results.map(item => [item[key], item])).values()
        //                 ];

        //                 // Update local JSON model so fragment list refreshes
        //                 const oLocalModel = sap.ui.getCore().getModel("localModel");
        //                 if (oLocalModel) {
        //                     oLocalModel.setProperty("/filter1Items", that.aUniquePurchaseOrders);
        //                 }

        //                 that.loadedPO = true;
        //                 resolve(oResponse.results);
        //             },
        //             error: function (oError) {
        //                 MessageBox.error("Failed to load PO Data");
        //                 console.error(oError);
        //                 reject(oError);
        //             }
        //         });
        //     });
        // },
        // getSchAggrement: function (sPlant, aExtraFilters = []) {
        //     let that = this;
        //     that.loadedSch = false;
        //     that.aSchAggrementData = [];
        //     that.aUniqueSchAggrements = [];

        //     return new Promise(function (resolve, reject) {
        //         // Base filter
        //         let aFilters = [];
        //         if (sPlant) {
        //             aFilters.push(new sap.ui.model.Filter("Plant", sap.ui.model.FilterOperator.EQ, sPlant));
        //         }

        //         // Add any additional filters
        //         if (aExtraFilters && aExtraFilters.length) {
        //             aFilters = aFilters.concat(aExtraFilters);
        //         }

        //         that.f4HelpModel.read("/ItemforSchAgr", {
        //             filters: aFilters,
        //             urlParameters: that.oParameters,
        //             success: function (oResponse) {
        //                 that.aSchAggrementData = oResponse.results;

        //                 const key = 'SchedulingAgreement';
        //                 that.aUniqueSchAggrements = [
        //                     ...new Map(oResponse.results.map(item => [item[key], item])).values()
        //                 ];

        //                 const oLocalModel = sap.ui.getCore().getModel("localModel");
        //                 if (oLocalModel) {
        //                     oLocalModel.setProperty("/filter2Items", that.aUniqueSchAggrements);
        //                 }

        //                 that.loadedSch = true;
        //                 resolve(oResponse.results);
        //             },
        //             error: function (oError) {
        //                 MessageBox.error("Failed to load Scheduling Agreement Data");
        //                 console.error(oError);
        //                 reject(oError);
        //             }
        //         });
        //     });
        // },

        getVendor: function (sPlant) {
            let that = this;
            that.aVendorData = [];
            that.aUniqueVendor = [];
            /*let filter = new sap.ui.model.Filter({
                path: "Plant",
                operator: sap.ui.model.FilterOperator.EQ,
                value1: sPlant
            });*/

            this.f4HelpModel.read("/SupplierVh", {
                //filters: [filter],
                urlParameters: that.oParameters,
                success: function (oResponse) {
                    that.aVendorData = oResponse.results;
                    /*const key = 'Supplier';
                    that.aUniqueVendor = [...new Map(oResponse.results.map(item =>
                        [item[key], item])).values()];*/
                },
                error: function (oError) {
                    MessageBox.error("Failed to load Vendor List");
                    console.log(oError);
                }
            });
        },

        getMaretial: function (sPlant) {
            let that = this;
            that.aMaterialData = [];
            that.aUniqueMaterial = [];
            let filter = new sap.ui.model.Filter({
                path: "Plant",
                operator: sap.ui.model.FilterOperator.EQ,
                value1: sPlant
            });
            this.f4HelpModel.read("/ProductF4Help", {
                filters: [filter],
                urlParameters: that.oParameters,
                success: function (oResponse) {
                    that.aMaterialData = oResponse.results;
                    const key = 'Product';
                    that.aUniqueMaterial = [...new Map(oResponse.results.map(item =>
                        [item[key], item])).values()];
                },
                error: function (oError) {
                    MessageBox.error("Failed to load Material List");
                    console.log(oError);
                }
            });
        },

        getChallanData: function (sPlant) {
            let that = this;
            let filter1 = new sap.ui.model.Filter({
                path: "Plant",
                operator: sap.ui.model.FilterOperator.EQ,
                value1: sPlant
            });
            this.challanModel.read("/YY1_ChallanNoF4Help", {
                filters: [filter1],
                urlParameters: that.oParameters,
                success: function (oResponse) {
                    that.aChallanListData = oResponse.results;
                    const key = 'IN_SubcontrgDocNmbr';
                    that.uniqueChallanList = [...new Map(oResponse.results.map(item =>
                        [item[key], item])).values()];
                },
                error: function (oError) {
                    MessageBox.error("Failed to load the Challan data");
                    console.log(oError);
                }
            });
        },


        _openPOValueHelp: function (oEvent) {
            let that = this;
            let oView = this.getView();
            let sPlant = oView.byId("idDropdownPlant").getSelectedKey();

            if (!sPlant) {
                MessageToast.show("Select a Plant");
                return;
            }



            // Open the fragment for value help
            if (!this._oValueHelpDialog) {
                Fragment.load({
                    id: oView.getId(), // 💡 Scopes fragment IDs to the view
                    name: "hodek.gateapps.fragments.PurchaseOrderDialog",
                    controller: this
                }).then(function (oDialog) {
                    this._oValueHelpDialog = oDialog;
                    oView.addDependent(oDialog);

                    // Now safely access the dialog using view-scoped ID
                    let oVHDialog = oView.byId("valueHelpDialog");

                    // Set model
                    let jModel = new sap.ui.model.json.JSONModel();
                    oVHDialog.setModel(jModel);

                    let aPurchaseOrderList = that.aUniquePurchaseOrders;
                    oVHDialog.getModel().setProperty("/filter1Items", aPurchaseOrderList);

                    let aSchedulingAggreList = that.aUniqueSchAggrements;
                    oVHDialog.getModel().setProperty("/filter2Items", aSchedulingAggreList);

                    oDialog.open();
                }.bind(this));
            } else {
                let oVHDialog = oView.byId("valueHelpDialog");

                let jModel = new sap.ui.model.json.JSONModel();
                oVHDialog.setModel(jModel);

                let aPurchaseOrderList = that.aUniquePurchaseOrders;
                oVHDialog.getModel().setProperty("/filter1Items", aPurchaseOrderList);

                let aSchedulingAggreList = that.aUniqueSchAggrements;
                oVHDialog.getModel().setProperty("/filter2Items", aSchedulingAggreList);

                this._oValueHelpDialog.open();
            }
        },

        // _openPOValueHelp: async function (oEvent) {
        //     let that = this;
        //     let oView = this.getView();
        //     let sPlant = oView.byId("idDropdownPlant").getSelectedKey();

        //     if (!sPlant) {
        //         sap.m.MessageToast.show("Please select a Plant first");
        //         return;
        //     }

        //     // 🧠 Ensure local JSON model exists globally
        //     if (!sap.ui.getCore().getModel("localModel")) {
        //         sap.ui.getCore().setModel(new sap.ui.model.json.JSONModel({
        //             filter1Items: [],
        //             filter2Items: []
        //         }), "localModel");
        //     }

        //     // 🧩 Load data before opening dialog
        //     // Call both in parallel if not loaded yet
        //     if (!this.loadedPO || !this.loadedSch) {
        //         sap.ui.core.BusyIndicator.show(0);
        //         try {
        //             await Promise.all([
        //                 this.getPurchaseOrders([], sPlant),
        //                 this.getSchAggrement([], sPlant)
        //             ]);
        //         } catch (e) {
        //             console.error("Error loading initial data", e);
        //         } finally {
        //             sap.ui.core.BusyIndicator.hide();
        //         }
        //     }

        //     // 💾 Bind retrieved data to the local model
        //     const oLocalModel = sap.ui.getCore().getModel("localModel");
        //     oLocalModel.setProperty("/filter1Items", this.aUniquePurchaseOrders || []);
        //     oLocalModel.setProperty("/filter2Items", this.aUniqueSchAggrements || []);

        //     // 🧩 Load and open the fragment
        //     if (!this._oValueHelpDialog) {
        //         const oDialog = await Fragment.load({
        //             id: oView.getId(),
        //             name: "hodek.gateapps.fragments.PurchaseOrderDialog",
        //             controller: this
        //         });

        //         this._oValueHelpDialog = oDialog;
        //         oView.addDependent(oDialog);

        //         // Attach the local model to fragment
        //         oDialog.setModel(oLocalModel, "localModel");

        //         oDialog.open();
        //     } else {
        //         // Reuse existing instance
        //         this._oValueHelpDialog.getModel("localModel").refresh(true);
        //         this._oValueHelpDialog.open();
        //     }
        // },

        POValueHelp: function () {
            if (this.loadedPO && this.loadedSch) {
                // Proceed to open the fragment
                this._openPOValueHelp(); // Custom method to open fragment
            } else {
                MessageToast.show("Please wait until all data is loaded.");
            }
        },

        onSearchPoList: function (oEvent) {
            var oList = oEvent.getSource().getParent().getContent()[1]; // Getting the corresponding list for the search field
            var sValue = oEvent.getParameter("newValue");

            var oBinding = oList.getBinding("items");
            let oFilter = new sap.ui.model.Filter({
                filters: [
                    new sap.ui.model.Filter("PurchaseOrder", sap.ui.model.FilterOperator.Contains, sValue),
                    new sap.ui.model.Filter("PurchaseOrderItemText", sap.ui.model.FilterOperator.Contains, sValue),
                    new sap.ui.model.Filter("SchedulingAgreement", sap.ui.model.FilterOperator.Contains, sValue),
                    new sap.ui.model.Filter("PurchasingDocumentItemText", sap.ui.model.FilterOperator.Contains, sValue)
                ]
            });
            //var oFilter = new sap.ui.model.Filter("Name", sap.ui.model.FilterOperator.Contains, sQuery);

            oBinding.filter(oFilter);
        },


        // onSearchPoList: function (oEvent) {
        //     let sValue = oEvent.getParameter('query').trim();
        //     let sPlant = this.sCurrentPlant; // for example, store it earlier
        //     let bIsPO = oEvent.getSource().getId().includes("searchFilter1");

        //     // Build filters dynamically
        //     let aExtraFilters = [];

        //     if (sValue) {
        //         if (bIsPO) {
        //             aExtraFilters.push(new sap.ui.model.Filter({
        //                 filters: [
        //                     new sap.ui.model.Filter("PurchaseOrder", sap.ui.model.FilterOperator.Contains, sValue),
        //                     new sap.ui.model.Filter("PurchaseOrderItemText", sap.ui.model.FilterOperator.Contains, sValue)
        //                 ],
        //                 and: false
        //             }));
        //         } else {
        //             aExtraFilters.push(new sap.ui.model.Filter({
        //                 filters: [
        //                     new sap.ui.model.Filter("SchedulingAgreement", sap.ui.model.FilterOperator.Contains, sValue),
        //                     new sap.ui.model.Filter("PurchasingDocumentItemText", sap.ui.model.FilterOperator.Contains, sValue)
        //                 ],
        //                 and: false
        //             }));
        //         }
        //     }

        //     // Call the appropriate method
        //     if (bIsPO) {
        //         this.getPurchaseOrders(sPlant, aExtraFilters);
        //     } else {
        //         this.getSchAggrement(sPlant, aExtraFilters);
        //     }
        // },
        //On selecting Purchase Order/Scheduling Aggrement
        onListItemPress: function (oEvent) {
            let that = this;
            this.maxRAPOAmountAllowed = undefined;
            var oItem = oEvent.getSource();
            var selectedItem = oItem.getBindingContext().getObject();
            let selectedValue = "",
                selectedKey = "";
            if (selectedItem.PurchaseOrder) {
                selectedValue = selectedItem.PurchaseOrder;
                selectedKey = "PurchaseOrder";
                this.selected_Po_Scheduling_Type = "PurchaseOrder";
                this.selected_Po_Scheduling_Value = selectedItem.PurchaseOrder;
                this.selectedPOSchAggrVendor = selectedItem.Supplier; //get the selected PO vendor
                this.selectedPOSchAggrVendorName = selectedItem.SupplierName; //get the selected PO vendor
            }
            else if (selectedItem.SchedulingAgreement) {
                selectedValue = selectedItem.SchedulingAgreement;
                selectedKey = "SchedulingAgreement";
                this.selected_Po_Scheduling_Type = "SchedulingAgreement";
                this.selected_Po_Scheduling_Value = selectedItem.SchedulingAgreement;
                this.selectedPOSchAggrVendor = selectedItem.Supplier; // get the selected scheduling Aggrement vendor
                this.selectedPOSchAggrVendorName = selectedItem.SupplierName; // get the selected scheduling Aggrement vendor
            }
            // Set the selected value in the input field
            var oInput = this.byId("idRAPO_PO_Order");
            oInput.setValue(selectedValue);
            this.getView().byId("idDocInvNo").setValue(); //clear invoice number on selecting po/scheduling aggrement

            //this.setPOTableData(selectedKey, selectedValue);
            let oModel = new sap.ui.model.json.JSONModel([]);
            this.getView().byId("idTable_RAPO").setModel(oModel);
            this.onAddReceiptAsPOTableItem();

            // Close the dialog
            this._oValueHelpDialog.close();

            //reset Amount field value state for RAPO
            let amountInput = that.getView().byId("idRAPO_Amount");
            amountInput.setValueState(sap.ui.core.ValueState.None);
        },

        onDialogClose: function () {
            this._oValueHelpDialog.close();
        },


        /* new code */

        onAddReceiptAsPOTableItem: function () {
            if (this.getView().byId("idRAPO_PO_Order").getValue() === "") {
                MessageToast.show("Select Purchase Order or Scheduling Aggrement");
                return;
            }
            let poTable = this.getView().byId("idTable_RAPO");
            let poTableData = poTable.getModel().getData();
            let tData = {};
            if (poTableData.length === 0) {
                tData = {
                    Material: "",
                    PurchaseOrder: "",
                    PurchaseOrderItemText: "",
                    PurchaseOrderItem: "",
                    AvailableQuantity: "",
                    Quantity: "",
                    Unit: "",
                    Plant: "",
                    Material2: "",
                    postedquantity: "",
                    final_qty: "",
                    EnteredQuantity: "",
                    isDeletable: false,
                    isMaterialSelected: false
                };
            }
            else {
                tData = {
                    Material: "",
                    PurchaseOrder: "",
                    PurchaseOrderItemText: "",
                    PurchaseOrderItem: "",
                    AvailableQuantity: "",
                    Quantity: "",
                    Unit: "",
                    Plant: "",
                    Material2: "",
                    postedquantity: "",
                    final_qty: "",
                    EnteredQuantity: "",
                    isDeletable: true,
                    isMaterialSelected: false
                };
            }
            poTableData.push(tData);
            poTable.getModel().refresh();
        },
        material_RAPOValueHelp: function (oEvent) {
            try {
                let that = this;
                let selectedInput = oEvent.getSource();
                let oCustomListItem = new sap.m.StandardListItem({
                    active: true,
                    title: {
                        parts: ["Material", "PurchaseOrderItemText"],
                        formatter: function (sMaterial, sText) {
                            return sMaterial ? sMaterial : sText;
                        }
                    },
                    description: "{PurchaseOrderItemText}"
                });

                let oSelectDialog = new sap.m.SelectDialog({
                    title: "Select Material",
                    noDataText: "No Data",
                    width: "50%",
                    growing: true,
                    growingThreshold: 12,
                    growingScrollToLoad: true,
                    confirm: function (oEvent) {
                        let aContexts = oEvent.getParameter("selectedContexts");
                        if (aContexts.length) {
                            let selectedValue = aContexts.map(function (oContext) {
                                return oContext.getObject();
                            });
                            let isMaterialAlreadySelected = false;
                            that.getView().byId("idTable_RAPO").getModel().getData().forEach(item => {

                                if (item.Material) {
                                    // Compare by Material if it's not empty
                                    if (item.Material === selectedValue[0].Material) {
                                        isMaterialAlreadySelected = true;
                                    }
                                } else {
                                    // Compare by PurchaseOrderItemText if Material is empty
                                    if (item.PurchaseOrderItemText === selectedValue[0].PurchaseOrderItemText) {
                                        isMaterialAlreadySelected = true;
                                    }
                                }
                            });
                            if (isMaterialAlreadySelected) {
                                MessageBox.error(`Material Number ${selectedValue[0].Material} is already selected`);
                            }
                            else {
                                selectedInput.setValue(selectedValue[0].Material);
                                selectedInput.getBindingContext().getObject().PurchaseOrderItemText = selectedValue[0].PurchaseOrderItemText;
                                selectedInput.getBindingContext().getObject().Material2 = selectedValue[0].Material2;
                                selectedInput.getBindingContext().getObject().isMaterialSelected = true; //enable Item Quantity Input
                                that.setSelectedMaterialDataToPOTable(selectedValue[0].Material, selectedInput);
                            }
                        }
                    },
                    liveChange: function (oEvent) {
                        let sValue = oEvent.getParameter("value");
                        let custFilter = new sap.ui.model.Filter({
                            filters: [
                                new sap.ui.model.Filter("Material", sap.ui.model.FilterOperator.Contains, sValue),
                                new sap.ui.model.Filter("PurchaseOrderItemText", sap.ui.model.FilterOperator.Contains, sValue)
                            ]
                        });
                        let oBinding = oEvent.getSource().getBinding("items");
                        oBinding.filter([custFilter]);
                    }
                });

                let selectedPurchaseOrder = this.getView().byId("idRAPO_PO_Order").getValue();
                let oModel = new sap.ui.model.json.JSONModel();
                let aUniqueMaterialItemList = [],
                    aUniqueMaterial = [];
                if (that.selected_Po_Scheduling_Type === "PurchaseOrder") {
                    that.aPurchaseOrdersData.filter(item => {
                        if (item.PurchaseOrder === selectedPurchaseOrder && aUniqueMaterial.indexOf(item.Material) === -1) {
                            aUniqueMaterial.push(item.Material);
                            aUniqueMaterialItemList.push(item);
                        }
                    });
                    oModel.setData({
                        modelData: aUniqueMaterialItemList
                    });
                }
                else { //this.selected_Po_Scheduling_Type = "SchedulingAgreement"
                    that.aSchAggrementData.filter(item => {
                        if (item.SchedulingAgreement === selectedPurchaseOrder && aUniqueMaterial.indexOf(item.Material) === -1) {
                            aUniqueMaterial.push(item.Material);
                            item.PurchaseOrderItemText = item.PurchasingDocumentItemText;
                            aUniqueMaterialItemList.push(item);
                        }
                    });
                    oModel.setData({
                        modelData: aUniqueMaterialItemList
                    });
                }
                oSelectDialog.setModel(oModel);
                oSelectDialog.bindAggregation("items", "/modelData", oCustomListItem);
                oSelectDialog.open();
            } catch (e) {
                console.log(e);
            }
        },
        setSelectedMaterialDataToPOTable: function (selectedMaterial, selectedInput) {
            let that = this;
            let selectedKey = that.selected_Po_Scheduling_Type,
                selectedPurchaseOrder = that.selected_Po_Scheduling_Value;
            let aSelectedPoMaterialItems = [];
            if (selectedKey === "PurchaseOrder") {
                that.aPurchaseOrdersData.filter(item => {
                    if (item.PurchaseOrder === selectedPurchaseOrder && item.Material === selectedMaterial) {
                        aSelectedPoMaterialItems.push(item);
                        /*aSelectedPoMaterialItems.push({
                            Material: item.Material,
                            PurchaseOrder: item.PurchaseOrder,
                            PurchaseOrderItemText: item.PurchaseOrderItemText,
                            PurchaseOrderItem: item.PurchaseOrderItem,
                            AvailableQuantity: "",
                            Quantity: item.OrderQuantity,
                            Unit: item.BaseUnit,
                            Plant: item.Plant,
                            postedquantity: item.postedquantity
                            //final_qty: item.final_qty
                        });*/
                    }
                });
            }
            else { //this.selectedKey = "SchedulingAgreement"
                that.aSchAggrementData.filter(item => {
                    if (item.SchedulingAgreement === selectedPurchaseOrder && item.Material === selectedMaterial) {
                        aSelectedPoMaterialItems.push(item);
                        /*aSelectedPoMaterialItems.push({
                            Material: item.Material,
                            PurchaseOrder: item.SchedulingAgreement,
                            PurchaseOrderItemText: item.PurchasingDocumentItemText,
                            PurchaseOrderItem: item.SchedulingAgreementItem,
                            AvailableQuantity: "",
                            Quantity: item.TargetQuantity,
                            Unit: item.OrderQuantityUnit,
                            Plant: item.Plant,
                            postedquantity: item.postedquantity
                            //final_qty: item.final_qty
                        });*/
                    }
                });
            }
            let groupedData = this.createGroupingForMaterialPOData(selectedKey, selectedPurchaseOrder, aSelectedPoMaterialItems);
            let tableData = [];
            let objectKeys = Object.keys(groupedData);
            objectKeys.forEach(item => {
                let totalPostedQty = 0;
                let uniqueRecord = {};
                groupedData[item].forEach(obj => {
                    uniqueRecord = obj;
                    totalPostedQty = totalPostedQty + parseFloat(obj.postedquantity);
                });
                uniqueRecord.postedquantity = totalPostedQty;
                uniqueRecord.AvailableQuantity = parseFloat(uniqueRecord.Quantity) - totalPostedQty;
                tableData.push(uniqueRecord);
            });

            let selectedTblRowData = selectedInput.getBindingContext().getObject();
            selectedTblRowData.Material = tableData[0].Material;
            selectedTblRowData.PurchaseOrder = tableData[0].PurchaseOrder;
            selectedTblRowData.PurchaseOrderItemText = tableData[0].PurchaseOrderItemText;
            selectedTblRowData.PurchaseOrderItem = tableData[0].PurchaseOrderItem;
            selectedTblRowData.AvailableQuantity = tableData[0].AvailableQuantity;
            selectedTblRowData.Quantity = tableData[0].Quantity;
            selectedTblRowData.Unit = tableData[0].Unit;
            selectedTblRowData.Plant = tableData[0].Plant;
            selectedTblRowData.postedquantity = tableData[0].postedquantity;
            selectedTblRowData.final_qty = tableData[0].final_qty;
            if (selectedKey === "PurchaseOrder") {
                selectedTblRowData.EffectiveAmount = tableData[0].EffectiveAmount;
            }
            else { //this.selected_Po_Scheduling_Type = "SchedulingAgreement"
                selectedTblRowData.NetPriceAmount = tableData[0].NetPriceAmount;
            }
            selectedInput.getModel().refresh();
            //let oModel = new sap.ui.model.json.JSONModel(tableData);
            //this.getView().byId("idTable_RAPO").setModel(oModel);

            // this.calculateMaxAmoutValue_RAPO()
        },

        createGroupingForMaterialPOData: function (selectedKey, selectedPurchaseOrder, aSelectedPoMaterialItems) {
            if (selectedKey === "PurchaseOrder") {
                // Function to group the objects by ItemNo & PurchaseOrderNo
                function groupObjects(array) {
                    let groupedObjects = {};
                    array.forEach(function (obj) {
                        if (obj.PurchaseOrder === selectedPurchaseOrder) {
                            // Create a unique key based on ItemNo and PurchaseOrderNo
                            //var key = obj.PurchaseOrderItem + "-" + obj.Material;
                            var key = obj.PurchaseOrderItem + "-" + obj.PurchaseOrder;
                            // If this combination exists, push the object to the array
                            if (!groupedObjects[key]) {
                                groupedObjects[key] = [];
                            }
                            obj.Quantity = obj.OrderQuantity;
                            obj.Unit = obj.BaseUnit;
                            groupedObjects[key].push(obj);
                        }
                    });
                    return groupedObjects;
                }
                // Call the function to group objects
                let groupedItemList = groupObjects(aSelectedPoMaterialItems);
                return groupedItemList;
            }
            else if (selectedKey === "SchedulingAgreement") {
                // Function to group the objects by ItemNo & PurchaseOrderNo
                function groupObjects(array) {
                    let groupedObjects = {};
                    array.forEach(function (obj) {
                        if (obj.SchedulingAgreement === selectedPurchaseOrder) {
                            // Create a unique key based on ItemNo and PurchaseOrderNo
                            // var key = obj.SchedulingAgreementItem + "-" + obj.Material;
                            var key = obj.SchedulingAgreementItem + "-" + obj.SchedulingAgreement;
                            // If this combination exists, push the object to the array
                            if (!groupedObjects[key]) {
                                groupedObjects[key] = [];
                            }
                            obj.PurchaseOrderItem = obj.SchedulingAgreementItem;
                            obj.PurchaseOrderItemText = obj.PurchasingDocumentItemText;
                            obj.Quantity = obj.TargetQuantity;
                            obj.Unit = obj.OrderQuantityUnit;
                            groupedObjects[key].push(obj);
                        }
                    });
                    return groupedObjects;
                }
                // Call the function to group objects
                let groupedItemList = groupObjects(aSelectedPoMaterialItems);
                return groupedItemList;
            }
        },

        onChangeRAPOItemQuantity: function (oEvent) {
            let oInput = oEvent.getSource();
            let value = oInput.getValue();
            let binding = oInput.getBindingContext().getObject();
            if (value === "") {
                binding.AvailableQuantity = value; //update entered Qty into available Quantity field
                let amountInput = this.getView().byId("idRAPO_Amount");
                amountInput.setValueState(sap.ui.core.ValueState.None);
                return;
            }
            if (binding.Material === "" && binding.PurchaseOrderItemText === "") {
                MessageToast.show("Select Material");
                oInput.setValue();
                binding.AvailableQuantity = ""; //update entered Qty into available Quantity field
                let amountInput = this.getView().byId("idRAPO_Amount");
                amountInput.setValueState(sap.ui.core.ValueState.None);
                return;
            }
            let maxValue = parseFloat(binding.Quantity) - parseFloat(binding.postedquantity); // Set the maximum value you want to allow

            // Allow only numbers and check if the value exceeds maxValue
            if (isNaN(value) || value > maxValue) {
                // Invalid input, revert to previous value or show an error
                oInput.setValueState(sap.ui.core.ValueState.Error);
                oInput.setValueStateText("Enter a valid number which should be less than or equals to " + maxValue);
                oInput.setValue();
                binding.AvailableQuantity = ""; //update entered Qty into available Quantity field
                //reset Amount field value state for RAPO
                // let amountInput = this.getView().byId("idRAPO_Amount");
                // amountInput.setValueState(sap.ui.core.ValueState.None);
            } else {
                binding.EnteredQuantity = value;
                binding.AvailableQuantity = value; //update entered Qty into available Quantity field
                // Valid input, clear error state
                oInput.setValueState(sap.ui.core.ValueState.None);
                // this.calculateMaxAmoutValue_RAPO(value);
            }
        },

        calculateMaxAmoutValue_RAPO: function (enteredQty) {
            let poTable = this.getView().byId("idTable_RAPO");
            let poTableData = poTable.getModel().getData();
            this.maxRAPOAmountAllowed = 0;
            if (this.selected_Po_Scheduling_Type === "PurchaseOrder") {
                let maxAmountForItem = 0;
                poTableData.forEach(item => {
                    let val1 = (item.EffectiveAmount / item.Quantity);
                    if (!enteredQty) {
                        maxAmountForItem = maxAmountForItem + (val1 * item.AvailableQuantity);
                    }
                    else {
                        maxAmountForItem = maxAmountForItem + (val1 * item.EnteredQuantity);
                    }
                });
                this.maxRAPOAmountAllowed = Math.ceil(maxAmountForItem);
            }
            else { //this.selected_Po_Scheduling_Type = "SchedulingAgreement"
                let maxAmountForItem = 0;
                poTableData.forEach(item => {
                    if (!enteredQty) {
                        maxAmountForItem = maxAmountForItem + (item.NetPriceAmount * item.AvailableQuantity);
                    }
                    else {
                        maxAmountForItem = maxAmountForItem + (item.NetPriceAmount * item.EnteredQuantity);
                    }
                });
                this.maxRAPOAmountAllowed = Math.ceil(maxAmountForItem);
            }
            let amountInput = this.getView().byId("idRAPO_Amount");
            if (amountInput.getValue() === "") {
                amountInput.setValueState(sap.ui.core.ValueState.None);
                return;
            }
            let enteredAmount = parseFloat(amountInput.getValue());
            if (enteredAmount > (this.maxRAPOAmountAllowed + 5) || enteredAmount < (this.maxRAPOAmountAllowed - 5)) {
                amountInput.setValueState(sap.ui.core.ValueState.Error);
                amountInput.setValueStateText(`Maximum Amount alloweded is ${this.maxRAPOAmountAllowed + 5} \n Minimum Amount alloweded is ${this.maxRAPOAmountAllowed - 5}`);
                amountInput.setValue();
            }
            else {
                amountInput.setValueState(sap.ui.core.ValueState.None);
            }
        },

        onChangeRAPOAmount: function (oEvent) {
            let oInput = oEvent.getSource();
            let enteredAmount = oInput.getValue();
            if (isNaN(enteredAmount)) {
                oInput.setValueState(sap.ui.core.ValueState.Error);
                oInput.setValueStateText("Enter a valid number");
                oInput.setValue();
            } else if (this.maxRAPOAmountAllowed !== undefined) {
                //if (parseFloat(enteredAmount) > this.maxRAPOAmountAllowed) {
                if ((parseFloat(enteredAmount) > (this.maxRAPOAmountAllowed + 5)) || (parseFloat(enteredAmount) < (this.maxRAPOAmountAllowed - 5))) {
                    let errMsg = `Maximum Amount alloweded is ${this.maxRAPOAmountAllowed + 5} \n Minimun Amount alloweded is ${this.maxRAPOAmountAllowed - 5}`;
                    oInput.setValueState(sap.ui.core.ValueState.Error);
                    oInput.setValueStateText(errMsg);
                    oInput.setValue();
                    return;
                }
                oInput.setValueState(sap.ui.core.ValueState.None);
            }
            else {
                oInput.setValueState(sap.ui.core.ValueState.None);
            }
        },



        /*   END   */

        onChangeAmount: function (oEvent) {
            let oInput = oEvent.getSource();
            let value = oInput.getValue();
            if (isNaN(value)) {
                oInput.setValueState(sap.ui.core.ValueState.Error);
                oInput.setValueStateText("Enter a valid number");
                oInput.setValue();
            } else {
                oInput.setValueState(sap.ui.core.ValueState.None);
            }
        },

        vendorValueHelp: function (oEvent) {
            try {
                let that = this;
                let selectedInput = oEvent.getSource();
                let oCustomListItem = new sap.m.StandardListItem({
                    active: true,
                    title: "{Supplier}",
                    description: "{SupplierName}"
                });

                let oSelectDialog = new sap.m.SelectDialog({
                    title: "Select Vendor",
                    noDataText: "No Data",
                    width: "50%",
                    growing: true,
                    growingThreshold: 12,
                    growingScrollToLoad: true,
                    confirm: function (oEvent) {
                        let aContexts = oEvent.getParameter("selectedContexts");
                        if (aContexts.length) {
                            let selectedValue = aContexts.map(function (oContext) {
                                return oContext.getObject();
                            });
                            selectedInput.setValue(selectedValue[0].Supplier);
                            that.getView().byId("idRAII_DocInvNo").setValue(); //clear Invoice number on selecting vendor
                        }
                    },
                    liveChange: function (oEvent) {
                        let sValue = oEvent.getParameter("value");
                        let custFilter = new sap.ui.model.Filter({
                            filters: [
                                new sap.ui.model.Filter("Supplier", sap.ui.model.FilterOperator.Contains, sValue),
                                new sap.ui.model.Filter("SupplierName", sap.ui.model.FilterOperator.Contains, sValue)
                            ]
                        });
                        let oBinding = oEvent.getSource().getBinding("items");
                        oBinding.filter([custFilter]);
                    }
                });
                let oModel = new sap.ui.model.json.JSONModel();
                oModel.setData({
                    modelData: that.aVendorData
                });
                oSelectDialog.setModel(oModel);
                oSelectDialog.bindAggregation("items", "/modelData", oCustomListItem);
                oSelectDialog.open();
            } catch (e) {
                console.log(e);
            }
        },

        getTransporter: function () {
            this.aTransporterList = [
                { Transporter: "CHOUDHARY ROADLINES" },
                { Transporter: "ARVIND ROADLINES" },
                { Transporter: "BHAGWAT MUTTE" },
                { Transporter: "BHAGWAT TRANSPORT SERVICES" },
                { Transporter: "METEORIC LOGISTICS PVT. LTD" },
                { Transporter: "SANGAM LOGISTIC SERVICES" },
                { Transporter: "CHANDRAKANT MUTHE" },
                { Transporter: "G R LOGISTICS" },
                { Transporter: "G S TRANSPORT CORPORATION" },
                { Transporter: "ARCHANA ROADLINES CORPORTION" },
                { Transporter: "VISHWAMBHAR ARJUN WAGHMARE" },
                { Transporter: "GANESH WANKHEDE" },
                { Transporter: "VRL LOGISTICS LTD" },
                { Transporter: "HARSHADA CRANE SERVICES" }
            ];

            /*let that = this;
            this.f4HelpModel.read("/TransporterF4Help", {
                urlParameters: that.oParameters,
                success: function (oResponse) {
                    that.aTransporterList = oResponse.results;
                },
                error: function (oError) {
                    MessageBox.error("Failed to load transporter list");
                    console.log(oError);
                }
            });*/
        },

        transporterValueHelp: function (oEvent) {
            try {
                let that = this;
                let selectedInput = oEvent.getSource();
                let oCustomListItem = new sap.m.StandardListItem({
                    active: true,
                    title: "{Transporter}"
                });
                /*let oCustomListItem = new sap.m.CustomListItem({
                    active: true,
                    content: [
                        new sap.m.HBox({
                            items: [
                                new sap.m.Label({
                                    text: "{Transporter}"
                                }).addStyleClass("sapMH4FontSize")
                            ]
                        }).addStyleClass("sapUiSmallMargin"),
                    ]
                });*/

                let oSelectDialog = new sap.m.SelectDialog({
                    title: "Select Transporter",
                    noDataText: "No Data",
                    width: "50%",
                    growing: true,
                    growingThreshold: 12,
                    growingScrollToLoad: true,
                    confirm: function (oEvent) {
                        let aContexts = oEvent.getParameter("selectedContexts");
                        if (aContexts.length) {
                            let selectedValue = aContexts.map(function (oContext) {
                                return oContext.getObject();
                            });
                            selectedInput.setValue(selectedValue[0].Transporter);
                        }
                    },
                    liveChange: function (oEvent) {
                        let sValue = oEvent.getParameter("value");
                        var oFilter = new sap.ui.model.Filter("Transporter", sap.ui.model.FilterOperator.Contains, sValue);
                        /*let oFilter = new Filter({
                            filters: [
                                new sap.ui.model.Filter("Transporter", sap.ui.model.FilterOperator.Contains, sValue)
                                new sap.ui.model.Filter("Transporter_Description", sap.ui.model.FilterOperator.Contains, sValue)
                            ]
                        });*/

                        let oBinding = oEvent.getSource().getBinding("items");
                        oBinding.filter(oFilter);
                        //oBinding.filter([oFilter]);
                    }
                });
                let oModel = new sap.ui.model.json.JSONModel();
                oModel.setData({
                    modelData: this.aTransporterList //view.getModel("searchModel").getData().searchModel
                });
                oSelectDialog.setModel(oModel);
                oSelectDialog.bindAggregation("items", "/modelData", oCustomListItem);
                oSelectDialog.open();
            } catch (e) {
                that.getView().setBusy(false);
            }
        },

        materialValueHelp: function (oEvent) {
            try {
                let that = this;
                let selectedInput = oEvent.getSource();
                let oCustomListItem = new sap.m.StandardListItem({
                    active: true,
                    title: "{Product}",
                    description: "{ProductName}"
                });

                let oSelectDialog = new sap.m.SelectDialog({
                    title: "Select Material",
                    noDataText: "No Data",
                    width: "50%",
                    growing: true,
                    growingThreshold: 12,
                    growingScrollToLoad: true,
                    confirm: function (oEvent) {
                        let aContexts = oEvent.getParameter("selectedContexts");
                        if (aContexts.length) {
                            let selectedValue = aContexts.map(function (oContext) {
                                return oContext.getObject();
                            });
                            selectedInput.setValue(selectedValue[0].Product);
                            selectedInput.getBindingContext().getObject().ProductName = selectedValue[0].ProductName;
                            selectedInput.getBindingContext().getObject().Unit = selectedValue[0].Unit;
                        }
                    },
                    liveChange: function (oEvent) {
                        let sValue = oEvent.getParameter("value");
                        let custFilter = new sap.ui.model.Filter({
                            filters: [
                                new sap.ui.model.Filter("Product", sap.ui.model.FilterOperator.Contains, sValue),
                                new sap.ui.model.Filter("ProductName", sap.ui.model.FilterOperator.Contains, sValue)
                            ]
                        });
                        let oBinding = oEvent.getSource().getBinding("items");
                        oBinding.filter([custFilter]);
                    }
                });
                let oModel = new sap.ui.model.json.JSONModel();
                oModel.setData({
                    modelData: that.aMaterialData
                });
                oSelectDialog.setModel(oModel);
                oSelectDialog.bindAggregation("items", "/modelData", oCustomListItem);
                oSelectDialog.open();
            } catch (e) {
                console.log(e);
            }
        },

        challanValueHelp: function (oEvent) {
            try {
                let that = this;
                let selectedInput = oEvent.getSource();
                let sPlant = this.getView().byId("idDropdownPlant").getSelectedKey();
                if (!sPlant) {
                    MessageToast.show("Select a Plant");
                    return;
                }
                let oCustomListItem = new sap.m.StandardListItem({
                    active: true,
                    title: "{IN_SubcontrgDocNmbr}",
                    description: "{ProductName}"
                });

                let oSelectDialog = new sap.m.SelectDialog({
                    title: "Select Challan",
                    noDataText: "No Data",
                    width: "50%",
                    growing: true,
                    growingThreshold: 12,
                    growingScrollToLoad: true,
                    confirm: function (oEvent) {
                        let aContexts = oEvent.getParameter("selectedContexts");
                        if (aContexts.length) {
                            let selectedValue = aContexts.map(function (oContext) {
                                return oContext.getObject();
                            });
                            selectedInput.setValue(selectedValue[0].IN_SubcontrgDocNmbr);
                            that.getView().byId("idRAII_Vendor").setValue(selectedValue[0].ActiveSupplier); //set vendor value

                            //Get Item data based om selected Challan No
                            that.getChallanItemData(selectedValue[0].IN_SubcontrgDocNmbr);
                        }
                    },
                    liveChange: function (oEvent) {
                        let sValue = oEvent.getParameter("value");
                        //var oFilter = new sap.ui.model.Filter("IN_SubcontrgDocNmbr", sap.ui.model.FilterOperator.Contains, sValue);
                        let oFilter = new sap.ui.model.FilterFilter({
                            filters: [
                                new sap.ui.model.Filter("IN_SubcontrgDocNmbr", sap.ui.model.FilterOperator.Contains, sValue),
                                new sap.ui.model.Filter("ProductName", sap.ui.model.FilterOperator.Contains, sValue)
                            ]
                        });

                        let oBinding = oEvent.getSource().getBinding("items");
                        //oBinding.filter(oFilter);
                        oBinding.filter([oFilter]);
                    }
                });
                let oModel = new sap.ui.model.json.JSONModel();
                oModel.setData({
                    modelData: this.uniqueChallanList
                });
                oSelectDialog.setModel(oModel);
                oSelectDialog.bindAggregation("items", "/modelData", oCustomListItem);
                oSelectDialog.open();
            } catch (e) {
                that.getView().setBusy(false);
            }
        },

        getChallanItemData: function (sChallanNo) {
            let that = this;
            this.getView().setBusy(true);
            let filter = new sap.ui.model.Filter({
                path: "Ponumber",
                operator: sap.ui.model.FilterOperator.EQ,
                value1: sChallanNo
            });
            // this.f4HelpModel.read(`/InwardItemDet?$filter=Ponumber eq '${sChallanNo}'`, {
            this.f4HelpModel.read("/InwardItemDet", {
                filters: [filter],
                urlParameters: that.oParameters,
                success: function (oResponse) {
                    that.getView().setBusy(false);
                    let RAIITableData = [];
                    if (oResponse.results.length > 0) {
                        RAIITableData = oResponse.results.filter(item => {
                            item.AvailableQuantity = parseFloat(item.Quantity) - parseFloat(item.Postedquantity);
                            return item;
                        });
                    }
                    else {
                        RAIITableData = that.aChallanListData.filter(item => {
                            if (item.IN_SubcontrgDocNmbr === sChallanNo) {
                                item.Itemno = item.MaterialDocumentItem;
                                item.Materialdesc = item.ProductName;
                                item.AvailableQuantity = parseFloat(item.Quantity);
                                return items;
                            }
                        });
                    }
                    that.setRAIITableData(RAIITableData);
                },
                error: function (oError) {
                    that.getView().setBusy(false);
                    MessageBox.error("Failed to load Challan Item data");
                    console.log(oError);
                }
            });
        },

        setRAIITableData: function (RAIITableData) {
            let oModel = new sap.ui.model.json.JSONModel(RAIITableData);
            this.getView().byId("idTable_RAII").setModel(oModel);
        },

        onAddReceiptAsItIsItem: function () {
            let RAIITable = this.getView().byId("idTable_RAII");
            let RAIITableData = RAIITable.getModel().getData();
            let tData = {};
            if (RAIITableData.length === 0) {
                tData = {
                    Itemno: "10",
                    Product: "",
                    ProductName: "",
                    AvailableQuantity: "",
                    Unit: ""
                };
            }
            else {
                let maxItemNum = Math.max(...RAIITableData.map(item => parseInt(item.Itemno)));
                tData = {
                    Itemno: (maxItemNum + 10).toString(),
                    Product: "",
                    ProductName: "",
                    AvailableQuantity: "",
                    Unit: ""
                };
            }
            RAIITableData.push(tData);
            RAIITable.getModel().refresh();
        },

        onDeleteReceiptAsItIsItem: function (oEvent) {
            let RAIITable = this.getView().byId("idTable_RAII");
            let RAIITableData = RAIITable.getModel().getData();
            let sPath = oEvent.getSource().getBindingContext().getPath(); //.split("/")[1];
            let iIndex = parseInt(sPath.substring(sPath.lastIndexOf("/") + 1), 10);
            RAIITableData.splice(iIndex, 1);
            RAIITable.getModel().refresh();
        },

        onSave: function () {
            let that = this;
            let oView = this.getView();
            let Plant = oView.byId("idDropdownPlant").getSelectedKey();
            if ((!Plant)) {
                MessageToast.show("Fill all mandatory fields");
                return;
            }

            let oDateFormat = DateFormat.getInstance({
                pattern: "yyyy-MM-dd'T'00:00:00"
            });
            let SystemDate = oDateFormat.format(new Date(oView.byId("idRAPO_Date").getValue())),
                time = oView.byId("idRAPO_Time").getValue().split(":"),
                hours = time[0].length === 1 ? ('0' + time[0]) : time[0],
                SystemTime = `PT${hours}H${time[1]}M${time[1]}S`;

            /*SystemDate = oDateFormat.format(new Date(oView.byId("idRAPO_Date").getValue())),
            time = oView.byId("idRAPO_Time").getValue().split(":"),
            hours = time[0].length === 1 ? ('0' + time[0]) : time[0],
            SystemTime = `PT${hours}H${time[1]}M${time[1]}S`;*/
            var Fiscalyear = oView.byId("idFiscalYear").getValue(),
                InvoiceNo = oView.byId("idDocInvNo").getValue(),
                InvoiceDate = oDateFormat.format(oView.byId("idRAPO_InvDate").getDateValue()),
                Lrdate = oDateFormat.format(oView.byId("idRAPO_LR_Date").getDateValue()),
                Lrnumber = oView.byId("idRAPO_LR_No").getValue(),
                Ponumber = oView.byId("idRAPO_PO_Order").getValue(),
                Vendor = this.selectedPOSchAggrVendor,
                Ewayno = oView.byId("idRAPO_EwayNo").getValue(),
                EwaybillDate = oDateFormat.format(oView.byId("idRAPO_EwayDate").getDateValue()) || null,
                Amount = oView.byId("idRAPO_Amount").getValue(),
                Vehicleno = oView.byId("idRAPO_VehicalNo").getValue(),
                Transporter = oView.byId("idRAPO_Trasporter").getValue();
            if (InvoiceNo === "" || (!InvoiceDate) || Ponumber === "" || Amount === "" || Vehicleno === "" || Transporter === "") {
                MessageToast.show("Fill all mandatory fields");
                return;
            }

            let isQuantityEntered = true;
            var itemData = [];
            this.getView().byId("idTable_RAPO").getModel().getData().filter(item => {
                if (item.AvailableQuantity === "" || item.EnteredQuantity === "") {
                    isQuantityEntered = false;
                }

                let obj
                if (item.SchedulingAgreementItem) {
                    obj = {
                        "Ponumber": Ponumber,
                        "LineItem": item.SchedulingAgreementItem,
                        "Material": item.Material,
                        "Materialdesc": item.PurchasingDocumentItemText,
                        "Quantity": parseFloat(item.TargetQuantity).toFixed(2),
                        "Postedquantity": parseFloat(item.EnteredQuantity).toFixed(2),
                        "Uom": item.OrderQuantityUnit
                    };
                } else {
                    if (item.Material2 === "X") {
                        item.Material = "";
                    }
                    obj = {
                        "Ponumber": Ponumber,
                        "LineItem": item.PurchaseOrderItem,
                        "Material": item.Material,
                        "Materialdesc": item.PurchaseOrderItemText,
                        "Quantity": parseFloat(item.Quantity).toFixed(2),
                        "Postedquantity": parseFloat(item.EnteredQuantity).toFixed(2),
                        "Uom": item.BaseUnit
                    };
                }

                itemData.push(obj);
            });
            if (!isQuantityEntered) {
                MessageToast.show("Enter Item Quantity");
                return;
            }



            let payload = {
                "AsnNo": "",
                "Inwardtype": "RECPO",
                "GateEntryId": "",
                "InvoiceNo": InvoiceNo,
                "Plant": Plant,
                "Fiscalyear": Fiscalyear,
                "SystemDate": SystemDate,
                "SystemTime": SystemTime,
                "InvoiceDate": InvoiceDate, //"2024-12-29T00:00:00",
                "Lrdate": (Lrdate !== "" ? Lrdate : null), //"2024-12-29T00:00:00",
                "Lrnumber": Lrnumber,
                "Ponumber": Ponumber,
                "Vendor": Vendor,
                "Ewayno": Ewayno,
                "EwaybillDate": EwaybillDate,
                "Amount": parseFloat(Amount).toFixed(2),
                "Vehicleno": Vehicleno,
                "Transporter": Transporter,
                "Status": "01",
                "Vendorname": this.selectedPOSchAggrVendorName,
                "to_Item": itemData
            };

            that.getView().setBusy(true);
            this.inGateEntryModel.create("/InwardGateHeader", payload, {
                method: "POST",
                success: function (oData, oResponse) {
                    that.getView().setBusy(false);
                    var qrDataToPrintQRCode = oResponse.data;
                    let qrData = oResponse.data;
                    let gateEntryNo = qrData.AsnNo;
                    let newGateEntryId = `IN${qrData.AsnNo}`
                    Models.updateGateEntryId(that, qrData.AsnNo, newGateEntryId)
                    console.log(oResponse);
                    var dialog = new Dialog("idPrintQRDialog", {
                        title: 'Success',
                        type: 'Message',
                        state: 'Success',
                        content: new sap.m.Text({
                            text: `Gate Entry Number IN${gateEntryNo} generated successfully`
                        }),
                        beginButton: new Button({
                            text: 'Download Gate Entry',
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
                            //oEvent.preventDefault();
                            that.onViewQR(qrDataToPrintQRCode); //call function to download QR code
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
            //     }.bind(this));
            // }, 10);
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
                        height: 10,
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
            that.clearUIFields();
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

            // Add the QR code image to the PDF
            doc.addImage(imgData, 'PNG', 15, 1, 20, 12); // Adjust size and position as necessary
            doc.text(2, 12, `ASN Number: ${qrData.AsnNo}`);
            doc.text(2, 14, `Gate Entry Number: IN${qrData.AsnNo}`);
            doc.text(2, 16, `Inv No.: ${qrData.InvoiceNo}`);
            doc.text(2, 18, `Inv Date: ${formattedInvDate}`);


            // doc.text(2, 21, `Vendor: ${this.selectedPOSchAggrVendorName} ( ${this.selectedPOSchAggrVendor} )`);
            let vendorText = `Vendor: ${this.selectedPOSchAggrVendorName} ( ${this.selectedPOSchAggrVendor} )`;
            let wrappedVendor = doc.splitTextToSize(vendorText, 42);
            doc.text(wrappedVendor, 2, 20, { maxWidth: 42, lineHeightFactor: 1.2 });
            // Save the PDF to a file
            doc.save(`Gate_Entry_${qrData.AsnNo}.pdf`);
        },

        clearUIFields: function () {
            let oView = this.getView();
            //oView.byId("idDocInvNo").setValue();
            oView.byId("idDropdownPlant").setSelectedKey();
            oView.byId("idDropdownPlant").setValue();
            oView.byId("idRAPO_Date").setValue();
            oView.byId("idRAPO_Time").setValue();
            oView.byId("idDocInvNo").setValue();
            oView.byId("idRAPO_InvDate").setValue();
            oView.byId("idRAPO_LR_Date").setValue();
            oView.byId("idRAPO_LR_No").setValue();
            oView.byId("idRAPO_PO_Order").setValue();
            oView.byId("idRAPO_EwayNo").setValue();
            oView.byId("idRAPO_Amount").setValue();
            oView.byId("idRAPO_VehicalNo").setValue();
            oView.byId("idRAPO_Trasporter").setValue();
            let tModel = new sap.ui.model.json.JSONModel([]);
            oView.byId("idTable_RAPO").setModel(tModel);
            let tDate = new Date();
            let oDateFormat = DateFormat.getInstance({
                pattern: "yyyy-MM-dd"
            });
            let formattedDate = oDateFormat.format(tDate); //`${tDate.getFullYear()}/${String(tDate.getMonth() + 1).padStart(2, '0')}/${String(tDate.getDate()).padStart(2, '0')}`;
            this.byId("idRAPO_Date").setValue(formattedDate);
            let currentTime = `${tDate.getHours()}:${tDate.getMinutes()}:${tDate.getSeconds()}`;
            this.byId("idRAPO_Time").setValue(currentTime);
            //oView.byId("idPanelChallan").setVisible(false);
        },

        onCancelGateEntry: function () {
            let that = this;
            let sPlant = this.getView().byId("idDropdownPlant").getSelectedKey();
            if (!sPlant) {
                MessageToast.show("Select a Plant");
                return;
            }
            if (!this.oFixedSizeDialog) {
                let gateEntryNoInput = new sap.m.Input({
                    maxLength: 20,
                    showValueHelp: true,
                    //valueHelpOnly: true,
                    //valueHelpRequest: that.getView().getController().GateEntryNoF4Help(),
                    valueHelpRequest: function (oEvent) {
                        that.GateEntryNoF4Help(oEvent);
                    },
                    liveChange: function (oEvent) {
                        if (isNaN(oEvent.getSource().getValue())) {
                            oEvent.getSource().setValue();
                            MessageToast.show("Enter valid number");
                        }
                    }
                });
                let gateEntryCancelRemark = new sap.m.TextArea({
                    width: '100%',
                    rows: 3,
                    maxLength: 50
                });
                this.oFixedSizeDialog = new sap.m.Dialog({
                    title: "Cancel Gate Entry",
                    contentWidth: "500px",
                    contentHeight: "230px",
                    content:
                        new sap.m.Panel({
                            content: [
                                new sap.m.VBox({
                                    items: [
                                        new sap.m.Label({
                                            text: 'Gate Entry Number',
                                            required: true
                                        }),
                                        gateEntryNoInput,
                                        new sap.m.Label({
                                            text: 'Remark',
                                            required: true
                                        }).addStyleClass("sapUiSmallMarginTop"),
                                        gateEntryCancelRemark
                                    ]
                                })
                            ]
                        }).addStyleClass('sapUiContentPadding', 'sapUiSmallMarginTop'),
                    beginButton: new sap.m.Button({
                        type: ButtonType.Emphasized,
                        text: "Submit",
                        press: function () {
                            let gateEntryNo = gateEntryNoInput.getValue();
                            let gateEntryIdCancelRemark = gateEntryCancelRemark.getValue();
                            if (gateEntryNo === "" || gateEntryIdCancelRemark === "") {
                                MessageToast.show('Enter the Gate Entry Number & Remark');
                                return;
                            }
                            let payload = {
                                Status: '05',
                                Remarks: gateEntryIdCancelRemark
                            };
                            that.getView().setBusy(true);
                            that.inGateEntryModel.update(`/InwardGateHeader('${gateEntryNo}')`, payload, {
                                //method: "PUT",
                                success: function (oData, oResponse) {
                                    that.getView().setBusy(false);
                                    MessageBox.success(`Gate Entry Number ${gateEntryNo} has been cancelled`);
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

                            gateEntryNoInput.setValue();
                            gateEntryCancelRemark.setValue();
                            that.oFixedSizeDialog.close();
                        }.bind(this)
                    }),
                    endButton: new sap.m.Button({
                        //type: ButtonType.Emphasized,
                        text: "Close",
                        press: function () {
                            gateEntryNoInput.setValue();
                            gateEntryCancelRemark.setValue();
                            this.oFixedSizeDialog.close();
                        }.bind(this)
                    })
                });

                //to get access to the controller's model
                this.getView().addDependent(this.oFixedSizeDialog);
            }
            this.oFixedSizeDialog.open();

            that.aGateEntryNum = [];
            let sParameters = {
                "$top": 500
            };
            let filter = new sap.ui.model.Filter({
                path: "Plant",
                operator: sap.ui.model.FilterOperator.EQ,
                value1: sPlant
            });
            that.f4HelpModel.read("/GateEntryNoF4Help", {
                filters: [filter],
                urlParameters: sParameters,
                success: function (oResponse) {
                    that.aGateEntryNum = oResponse.results.sort((a, b) => {
                        return b.GateEntryId - a.GateEntryId;
                    });
                },
                error: function (oError) {
                    MessageBox.error("Failed to load gate entry number list");
                }
            });
        },

        GateEntryNoF4Help: function (oEvent) {
            try {
                let that = this;
                let selectedInput = oEvent.getSource();
                let oCustomListItem = new sap.m.StandardListItem({
                    active: true,
                    title: "{GateEntryId}"
                });

                let oSelectDialog = new sap.m.SelectDialog({
                    title: "Select Gate Entry ID",
                    noDataText: "No Data",
                    width: "50%",
                    growing: true,
                    growingThreshold: 12,
                    growingScrollToLoad: true,
                    confirm: function (oEvent) {
                        let aContexts = oEvent.getParameter("selectedContexts");
                        if (aContexts.length) {
                            let selectedValue = aContexts.map(function (oContext) {
                                return oContext.getObject();
                            });
                            selectedInput.setValue(selectedValue[0].GateEntryId);
                        }
                    },
                    liveChange: function (oEvent) {
                        let sValue = oEvent.getParameter("value");
                        let custFilter = new sap.ui.model.Filter("GateEntryId", sap.ui.model.FilterOperator.Contains, sValue);
                        let oBinding = oEvent.getSource().getBinding("items");
                        oBinding.filter(custFilter);
                    }
                });
                let oModel = new sap.ui.model.json.JSONModel();
                oModel.setData({
                    modelData: that.aGateEntryNum
                });
                oSelectDialog.setModel(oModel);
                oSelectDialog.bindAggregation("items", "/modelData", oCustomListItem);
                oSelectDialog.open();
            } catch (e) {
                console.log(e);
            }
        },

        onRePrintGateEntryQR: function () {
            let that = this;
            let sPlant = this.getView().byId("idDropdownPlant").getSelectedKey();
            if (!sPlant) {
                MessageToast.show("Select a Plant");
                return;
            }
            if (!this.sReprintQRDialog) {
                let gateEntryNoInput = new sap.m.Input({
                    maxLength: 20,
                    showValueHelp: true,
                    showValueHelpOnly: true,
                    valueHelpRequest: function (oEvent) {
                        that.GateEntryNoF4Help(oEvent);
                    }/*,
                    liveChange: function (oEvent) {
                        if (isNaN(oEvent.getSource().getValue())) {
                            oEvent.getSource().setValue();
                            MessageToast.show("Enter valid number");
                        }
                    }*/
                });
                this.sReprintQRDialog = new sap.m.Dialog({
                    title: "Reprint Gate Entry QR",
                    contentWidth: "500px",
                    contentHeight: "125px",
                    content:
                        new sap.m.Panel({
                            content: [
                                new sap.m.VBox({
                                    items: [
                                        new sap.m.Label({
                                            text: 'Gate Entry Number',
                                            required: true
                                        }),
                                        gateEntryNoInput
                                    ]
                                })
                            ]
                        }).addStyleClass('sapUiContentPadding', 'sapUiSmallMarginTop'),
                    beginButton: new sap.m.Button({
                        type: ButtonType.Emphasized,
                        text: "Reprint QR",
                        press: function () {
                            let sGateEntryNo = gateEntryNoInput.getValue();
                            if (sGateEntryNo === "") {
                                MessageToast.show('Select the Gate Entry Number');
                                return;
                            }
                            let qrData = that.aGateEntryNum.find(item => {
                                return item.GateEntryId === sGateEntryNo;
                            });
                            if (!qrData) {
                                MessageToast.show('Select valid Gate Entry Number');
                                return;
                            }
                            that.onViewQR(qrData);
                            gateEntryNoInput.setValue();
                            that.sReprintQRDialog.close();
                        }.bind(this)
                    }),
                    endButton: new sap.m.Button({
                        text: "Cancel",
                        press: function () {
                            gateEntryNoInput.setValue();
                            this.sReprintQRDialog.close();
                        }.bind(this)
                    })
                });

                //to get access to the controller's model
                this.getView().addDependent(this.sReprintQRDialog);
            }
            this.sReprintQRDialog.open();

            that.aGateEntryNum = [];
            let sParameters = {
                "$top": 500
            };
            let filter = new sap.ui.model.Filter({
                path: "Plant",
                operator: sap.ui.model.FilterOperator.EQ,
                value1: sPlant
            });
            that.getView().setBusy(true);
            that.f4HelpModel.read("/GateEntryNoF4Help", { //InwardGateHeader
                filters: [filter],
                urlParameters: sParameters,
                success: function (oResponse) {
                    that.getView().setBusy(false);
                    that.aGateEntryNum = oResponse.results.sort((a, b) => {
                        return b.GateEntryId - a.GateEntryId;
                    });
                },
                error: function (oError) {
                    that.getView().setBusy(false);
                    MessageBox.error("Failed to load gate entry number list");
                }
            });
        },
        onDeleteReceiptAsPoItem: function (oEvent) {
            let that = this;
            let RAIITable = this.getView().byId("idTable_RAPO");
            let RAIITableData = RAIITable.getModel().getData();
            let sPath = oEvent.getSource().getBindingContext().getPath(); //.split("/")[1];
            let iIndex = parseInt(sPath.substring(sPath.lastIndexOf("/") + 1), 10);
            RAIITableData.splice(iIndex, 1);
            RAIITable.getModel().refresh();
            setTimeout(function () {
                that.calculateMaxAmoutValue_RAPO();
            }, 200);
        },
        // allowOnlyDigits: function (oEvent) {
        //     const oInput = oEvent.getSource();
        //     let sValue = oInput.getValue();

        //     // Remove invalid characters (allow only digits and '.')
        //     sValue = sValue.replace(/[^0-9.]/g, '');

        //     // Allow only one decimal point
        //     const parts = sValue.split('.');
        //     if (parts.length > 2) {
        //         sValue = parts[0] + '.' + parts[1];
        //     }

        //     // Restrict to two digits after decimal
        //     if (parts[1]?.length > 2) {
        //         sValue = parts[0] + '.' + parts[1].substring(0, 2);
        //     }

        //     oInput.setValue(sValue);
        //     this.onChangeRAPOItemQuantity(oEvent);
        // }


    });
});