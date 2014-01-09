/*global $:false, document:false */

// App Wide Script
$(document).ready(function() {

});

$(function() {

  // Visual Ajax Request Representation
  $(document).on({
    ajaxStart: function() {
      $('body').addClass("loading");
    },
    ajaxStop: function() {
      $('body').removeClass("loading");
    }
  });

});