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

    return Controller.extend("hodek.gateapps.controller.GERetrunAsItIs", {
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
            this.byId("idRAII_FiscalYear").setValue(currentYear);
            this.byId("idRAII_InvDate").setMaxDate(new Date);
            // this.byId("idRAII_LR_Date").setMaxDate(new Date);
            this.f4HelpModel = this.getOwnerComponent().getModel("vendorModel");
            this.inGateEntryModel = this.getOwnerComponent().getModel("vendorModel");
            let tDate = new Date();
            let oDateFormat = DateFormat.getInstance({
                pattern: "yyyy-MM-dd"
            });
            let formattedDate = oDateFormat.format(tDate); //`${tDate.getFullYear()}/${String(tDate.getMonth() + 1).padStart(2, '0')}/${String(tDate.getDate()).padStart(2, '0')}`;
            this.byId("idRAII_Date").setValue(formattedDate);
            let currentTime = `${tDate.getHours()}:${tDate.getMinutes()}:${tDate.getSeconds()}`;
            this.byId("idRAII_Time").setValue(currentTime);
            // that.getPlantData();
            Models._loadPlants(this);
            that.getVendor("");   //need to check with team
            oRouter.getRoute("RouteGEAsItIs").attachPatternMatched(this._onRouteMatched, this);
        },
        _onRouteMatched: function () { },

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

        onChangeRAII_DocInvNo: function (oEvent) {
            let oInput = oEvent.getSource();
            let sValue = oInput.getValue();
            if (sValue === "") {
                return;
            }
            let selectedVendor = this.getView().byId("idRAII_Vendor").getValue();
            if (selectedVendor === "") {
                oInput.setValue();
                MessageToast.show("Select Vendor");
                return;
            }
            var aFinalFilter = new sap.ui.model.Filter({
                filters: [
                    new sap.ui.model.Filter("InvoiceNo", sap.ui.model.FilterOperator.EQ, sValue),
                    new sap.ui.model.Filter("Vendor", sap.ui.model.FilterOperator.EQ, selectedVendor),
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
            let oValidatedComboBox = oEvent.getSource(),
                sSelectedKey = oValidatedComboBox.getSelectedKey(),
                sValue = oValidatedComboBox.getValue();
            this.getView().setBusy(true);
            if (!sSelectedKey && sValue) {
                oValidatedComboBox.setValueState(ValueState.Error);
                oValidatedComboBox.setValueStateText("Invalid Value");
                this.getView().setBusy(false);
            } else {
                oValidatedComboBox.setValueState(ValueState.None);
                this.getMaretial(sSelectedKey); //load material/product list
                this.clearFieldsOnClearPlant();
                // this.getPurchaseOrders(sSelectedKey); //load purchase order list
                // this.getSchAggrement(sSelectedKey); //load scheduling agreement list

                //this.getChallanData(sSelectedKey);
            }
        },

        clearFieldsOnClearPlant: function () {
            let oView = this.getView();
            let sModel = new sap.ui.model.json.JSONModel([]);
            oView.byId("idTable_RAII").setModel(sModel);
            this.onAddReceiptAsItIsItem();

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
            that.aPurchaseOrdersData = [];
            that.aUniquePurchaseOrders = [];

            let filter = new sap.ui.model.Filter({
                path: "Plant",
                operator: sap.ui.model.FilterOperator.EQ,
                value1: sPlant
            });
            this.getView().setBusy(true);
            //this.f4HelpModel.read(`/ItemforPo?$filter=Plant eq '${sPlant}'&$top=1000`, {
            this.f4HelpModel.read("/ItemforPo", {
                filters: [filter],
                urlParameters: that.oParameters,  // The top limit
                success: function (oResponse) {
                    that.getView().setBusy(false);
                    that.aPurchaseOrdersData = oResponse.results;
                    const key = 'PurchaseOrder';
                    that.aUniquePurchaseOrders = [...new Map(oResponse.results.map(item =>
                        [item[key], item])).values()];
                },
                error: function (oError) {
                    that.getView().setBusy(false);
                    MessageBox.error("Failed to load PO Data");
                    console.log(oError);
                }
            });

        },

        getSchAggrement: function (sPlant) {
            let that = this;
            that.aSchAggrementData = [];
            that.aUniqueSchAggrements = [];

            let filter = new sap.ui.model.Filter({
                path: "Plant",
                operator: sap.ui.model.FilterOperator.EQ,
                value1: sPlant
            });
            // this.f4HelpModel.read(`/ItemforSchAgr?$filter=Plant eq '${sPlant}'`, {
            this.f4HelpModel.read("/ItemforSchAgr", {
                filters: [filter],
                urlParameters: that.oParameters,
                success: function (oResponse) {
                    that.aSchAggrementData = oResponse.results;
                    const key = 'SchedulingAgreement';
                    that.aUniqueSchAggrements = [...new Map(oResponse.results.map(item =>
                        [item[key], item])).values()];
                },
                error: function (oError) {
                    MessageBox.error("Failed to load Scheduling Aggrement Data");
                    console.log(oError);
                }
            });


        },

        getVendor: function (sPlant) {
            let that = this;
            that.aVendorData = [];
            that.aUniqueVendor = [];
            let filter = new sap.ui.model.Filter({
                path: "Plant",
                operator: sap.ui.model.FilterOperator.EQ,
                value1: sPlant
            });

            this.f4HelpModel.read("/SupplierVh", {
                // filters: [filter],
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
            this.f4HelpModel.read("/plantProduct", {
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


        POValueHelp: function (oEvent) {
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
                this.selectedPOSchAggrVendorName = selectedItem.SupplierName;
            }
            else if (selectedItem.SchedulingAgreement) {
                selectedValue = selectedItem.SchedulingAgreement;
                selectedKey = "SchedulingAgreement";
                this.selected_Po_Scheduling_Type = "SchedulingAgreement";
                this.selected_Po_Scheduling_Value = selectedItem.SchedulingAgreement;
                this.selectedPOSchAggrVendor = selectedItem.Supplier; // get the selected scheduling Aggrement vendor
                this.selectedPOSchAggrVendorName = selectedItem.SupplierName;
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
                    title: "{Material}",
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
                                if (item.Material === selectedValue[0].Material) {
                                    isMaterialAlreadySelected = true;
                                }
                            });
                            if (isMaterialAlreadySelected) {
                                MessageBox.error(`Material Number ${selectedValue[0].Material} is already selected`);
                            }
                            else {
                                selectedInput.setValue(selectedValue[0].Material);
                                selectedInput.getBindingContext().getObject().PurchaseOrderItemText = selectedValue[0].PurchaseOrderItemText;
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

            this.calculateMaxAmoutValue_RAPO()
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
            if (binding.Material === "") {
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
                let amountInput = this.getView().byId("idRAPO_Amount");
                amountInput.setValueState(sap.ui.core.ValueState.None);
            } else {
                binding.EnteredQuantity = value;
                binding.AvailableQuantity = value; //update entered Qty into available Quantity field
                // Valid input, clear error state
                oInput.setValueState(sap.ui.core.ValueState.None);
                this.calculateMaxAmoutValue_RAPO(value);
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
                            that.Vendorname = selectedValue[0].SupplierName;
                            that.Vendorcode = selectedValue[0].Supplier;
                            that.vendorValue = `${selectedValue[0].SupplierName}(${selectedValue[0].Supplier})`
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





        materialValueHelp: function (oEvent) {
            try {
                let that = this;
                let selectedInput = oEvent.getSource();
                let oCustomListItem = new sap.m.StandardListItem({
                    active: true,
                    title: "{Product}",
                    description: "{ProductDescription}"
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
                            selectedInput.getBindingContext().getObject().ProductDescription = selectedValue[0].ProductDescription;
                            selectedInput.getBindingContext().getObject().BaseUnit = selectedValue[0].BaseUnit;
                        }
                    },
                    liveChange: function (oEvent) {
                        let sValue = oEvent.getParameter("value");
                        let custFilter = new sap.ui.model.Filter({
                            filters: [
                                new sap.ui.model.Filter("Product", sap.ui.model.FilterOperator.Contains, sValue),
                                new sap.ui.model.Filter("ProductDescription", sap.ui.model.FilterOperator.Contains, sValue)
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
                    ProductDescription: "",
                    AvailableQuantity: "",
                    BaseUnit: ""
                };
            }
            else {
                let maxItemNum = Math.max(...RAIITableData.map(item => parseInt(item.Itemno)));
                tData = {
                    Itemno: (maxItemNum + 10).toString(),
                    Product: "",
                    ProductDescription: "",
                    AvailableQuantity: "",
                    BaseUnit: ""
                };
            }
            RAIITableData.push(tData);
            RAIITable.getModel().refresh();
            this.getView().setBusy(false);
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
            let SystemDate = oDateFormat.format(new Date(oView.byId("idRAII_Date").getValue())),
                time = oView.byId("idRAII_Time").getValue().split(":"),
                hours = time[0].length === 1 ? ('0' + time[0]) : time[0],
                SystemTime = `PT${hours}H${time[1]}M${time[1]}S`;

            /*SystemDate = oDateFormat.format(new Date(oView.byId("idRAPO_Date").getValue())),
            time = oView.byId("idRAPO_Time").getValue().split(":"),
            hours = time[0].length === 1 ? ('0' + time[0]) : time[0],
            SystemTime = `PT${hours}H${time[1]}M${time[1]}S`;*/
            var Fiscalyear = oView.byId("idRAII_FiscalYear").getValue(),
                InvoiceNo = oView.byId("idRAII_DocInvNo").getValue(),
                InvoiceDate = oDateFormat.format(oView.byId("idRAII_InvDate").getDateValue()),
                // Lrdate = oDateFormat.format(oView.byId("idRAPO_LR_Date").getDateValue()),
                // Lrnumber = oView.byId("idRAPO_LR_No").getValue(),
                // Ponumber = oView.byId("idRAPO_PO_Order").getValue(),
                Challanno = oView.byId("idRAII_Challan").getValue(),
                VehicleType = oView.byId("idRAII_VehicalType").getValue(),
                VehicleCapacity = oView.byId("idRAII_VehicalCapacity").getValue(),
                Transporter = oView.byId("idRAII_Trasporter").getValue(),
                TransporterCode = oView.byId("idRAII_TrasporterCode").getValue(),
                Vendor = that.Vendorcode,
                Ewayno = oView.byId("idRAII_EwayNo").getValue(),
                EwaybillDate = oDateFormat.format(oView.byId("idRAII_EwayDate").getDateValue()) ||null,
                Amount = oView.byId("idRAII_Amount").getValue(),
                Vehicleno = oView.byId("idRAII_VehicalNo").getValue();
            if (InvoiceNo === "" || (!InvoiceDate) || Ewayno === "" || Amount === "" || Vehicleno === "" || Transporter === "") {
                MessageToast.show("Fill all mandatory fields");
                return;
            }

            let isQuantityEntered = true, isMaterialSelected = true;
            var itemData = [];
            this.getView().byId("idTable_RAII").getModel().getData().filter(item => {
                if (item.Product === "") {
                    isMaterialSelected = false;
                }
                // if (item.AvailableQuantity === "") {
                //     isQuantityEntered = false;
                // }
                let obj = {
                    "Ponumber": "",
                    "LineItem": item.Itemno,
                    "Material": item.Product,
                    "Materialdesc": item.ProductDescription,
                    "Quantity": "0.00",
                    "Postedquantity": parseFloat(item.AvailableQuantity).toFixed(2),
                    "Uom": item.BaseUnit
                };


                itemData.push(obj);
            });
            if (!isMaterialSelected) {
                MessageToast.show("Select Material");
                return;
            }
            // if (!isQuantityEntered) {
            //     MessageToast.show("Enter Item Quantity");
            //     return;
            // }



            let payload = {
                "AsnNo": "",
                "GateEntryId": "",
                "InvoiceNo": InvoiceNo,
                "Plant": Plant,
                "Inwardtype": "RECASIS",
                "Fiscalyear": Fiscalyear,
                "SystemDate": SystemDate,
                "SystemTime": SystemTime,
                "InvoiceDate": InvoiceDate, //"2024-12-29T00:00:00",
                // "Lrdate": (Lrdate !== "" ? Lrdate : null), //"2024-12-29T00:00:00",
                // "Lrnumber": Lrnumber,
                "Ponumber": "",
                "Vehicletype": VehicleType,
                "Vehiclecapacity": VehicleCapacity,
                "Transportelcode": TransporterCode,
                "Zchalan": Challanno,
                "Vendor": Vendor,
                "Vendorname": that.Vendorname,
                "Ewayno": Ewayno,
                "EwaybillDate": EwaybillDate,
                "Amount": parseFloat(Amount).toFixed(2),
                "Vehicleno": Vehicleno,
                "Transporter": Transporter,
                "Status": "01",
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
                                that.clearUIFields();
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
                            that.clearUIFields();
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
            doc.addImage(imgData, 'PNG', 15, 1, 20, 10); // Adjust size and position as necessary
            doc.text(2, 12, `ASN Number: ${qrData.AsnNo} |`);
            doc.text(23, 12, `Gate Entry No: IN${qrData.AsnNo}`);
            doc.text(2, 15, `Inv No: ${qrData.InvoiceNo}`);
            doc.text(2, 18, `Inv Date: ${formattedInvDate}`);


            // doc.text(2, 21, `Vendor: ${this.vendorValue}`);
            let vendorText = `Vendor: ${this.vendorValue}`;
            let wrappedVendor = doc.splitTextToSize(vendorText, 42);
            doc.text(wrappedVendor, 2, 21, { maxWidth: 42, lineHeightFactor: 1.2 });

            // Save the PDF to a file
            doc.save(`Gate_Entry_IN${qrData.AsnNo}.pdf`);
        },

        clearUIFields: function () {
            let oView = this.getView();
            oView.byId("idDropdownPlant").setSelectedKey();
            oView.byId("idDropdownPlant").setValue();
            oView.byId("idRAII_InvDate").setValue();
            // oView.byId("idRAII_LR_Date").setValue();
            // oView.byId("idRAII_LR_No").setValue();
            oView.byId("idRAII_Challan").setValue();
            oView.byId("idRAII_Vendor").setValue();
            oView.byId("idRAII_DocInvNo").setValue();
            oView.byId("idRAII_VehicalType").setValue();
            oView.byId("idRAII_VehicalCapacity").setValue();
            oView.byId("idRAII_TrasporterCode").setValue();
            oView.byId("idRAII_EwayNo").setValue();
            oView.byId("idRAII_Amount").setValue();
            oView.byId("idRAII_VehicalNo").setValue();
            oView.byId("idRAII_Trasporter").setValue();
            let tModel = new sap.ui.model.json.JSONModel([]);
            oView.byId("idTable_RAII").setModel(tModel);
            let tDate = new Date();
            let oDateFormat = DateFormat.getInstance({
                pattern: "yyyy-MM-dd"
            });
            let formattedDate = oDateFormat.format(tDate); //`${tDate.getFullYear()}/${String(tDate.getMonth() + 1).padStart(2, '0')}/${String(tDate.getDate()).padStart(2, '0')}`;
            this.byId("idRAII_Date").setValue(formattedDate);
            let currentTime = `${tDate.getHours()}:${tDate.getMinutes()}:${tDate.getSeconds()}`;
            this.byId("idRAII_Time").setValue(currentTime);
        },

        onDeleteReceiptAsPoItem: function (oEvent) {
            let that = this;
            let RAIITable = this.getView().byId("idTable_RAII");
            let RAIITableData = RAIITable.getModel().getData();
            let sPath = oEvent.getSource().getBindingContext().getPath(); //.split("/")[1];
            let iIndex = parseInt(sPath.substring(sPath.lastIndexOf("/") + 1), 10);
            RAIITableData.splice(iIndex, 1);
            RAIITable.getModel().refresh();
            setTimeout(function () {
                that.calculateMaxAmoutValue_RAPO();
            }, 200);
        },




    });
});