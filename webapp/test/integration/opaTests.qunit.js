/* global QUnit */
QUnit.config.autostart = false;

sap.ui.require(["hodek/gateapps/test/integration/AllJourneys"
], function () {
	QUnit.start();
});
