sap.ui.define([], function () {
    "use strict";
    return {
        formatDateToDDMMYYYY: function (oDate) {
            if (!oDate) return "";

            const date = new Date(oDate);
            const dd = String(date.getDate()).padStart(2, '0');
            const mm = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-based
            const yyyy = date.getFullYear();

            return `${dd}.${mm}.${yyyy}`;
        },
        formatPurchaseOrderText: function (sPo, sPoText) {
            return sPo + " [ " + (sPoText ? sPoText : "NA") + " ]";
        },
        formatDateToYyyyMmDd: function (oDate) {
            const year = oDate.getFullYear();
            const month = String(oDate.getMonth() + 1).padStart(2, '0');
            const day = String(oDate.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`; // e.g. "2025-08-07"
        },
        formatHours: function (time) {
            let ms = time.ms;
            // Convert to hours, minutes, seconds
            let totalSeconds = Math.floor(ms / 1000);
            let hours = Math.floor(totalSeconds / 3600);
            let minutes = Math.floor((totalSeconds % 3600) / 60);
            let seconds = totalSeconds % 60;

            // Pad to always have two digits
            hours = String(hours).padStart(2, "0");
            minutes = String(minutes).padStart(2, "0");
            seconds = String(seconds).padStart(2, "0");

            let formattedTime = `${hours}:${minutes}:${seconds}`;
            return formattedTime;

        }


    };
});