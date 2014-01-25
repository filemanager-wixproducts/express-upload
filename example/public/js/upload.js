/* global tmpl*/

// Helper Functions
function fileExtension(filename) {
    return filename.split('.').pop().toLowerCase();
}

function template(el, opts) {
  return $($.parseHTML(tmpl($.trim($(el).html()), opts)));
}

function clearFileList() {
  $(".file-container").empty();
}

// File Upload
var acceptFileTypes = /(\.|\/)(txt|zip|avi|mp4|mpg|mpeg|m4v|mov|mkv)$/i;
$(function () {
  $('#fileupload').fileupload({

    // Settings
    dataType: 'json',
    autoUpload: false,
    // formData: { sessid : '{{ user._id }}' },
    acceptFileTypes: acceptFileTypes,

    // Uploading Done
    done: function (e, data) {
        console.log('File upload done');
        console.log(e);
        console.log(data);
    },

    // Total Progress
    progressall: function (e, data) {
      var progress = parseInt(data.loaded / data.total * 100, 10);
      $('#total-progress').children().first()
        .attr('aria-valuenow', progress)
        .css('width', progress + '%');
    },

    // Individual Progress
    progress: function (e, data) {
      var progress = parseInt(data.loaded / data.total * 100, 10);
      if(data.context) {
        data.context.each(function () {
          $(this).find('.progress')
            .attr('aria-valuenow', progress)
            .children().first().css('width', progress + '%'
            );
        });
      }
    },

    // File(s) Added
    add: function (e, data) {
      $.each(data.files, function (index, file) {
        if((acceptFileTypes).test(file.name)) {

          // Generate File Element
          var node = template('#template-uploaditem', {
            filename : file.name
          });

          // Bind File Element Button -> Upload
          node.find('.btn-upload').click(function() {
            data.submit().error(function (jqXHR, textStatus, errorThrown) {
              console.log(jqXHR);
              console.log(textStatus);
              console.log(errorThrown);
              alert('File upload error, refresh and try again.');
            });
          });

          // Add Item to Window
          node.appendTo('.file-container');

          // Bind data.context
          data.context = node;
          
        } else {
          alert(fileExtension(file.name)+ ' is not a valid file type.');
        }
      });
    }

  }); // END: $(fileupload).fileupload();
});

// UI Helpers
$(document).ready(function() {

  // Toggle upload "All" button on dragged or selected file elements to upload
  var numberOfRows = $(".file-container>div").length;
  $(".file-container").bind("DOMSubtreeModified", function() {
    if($(".file-container>div").length !== numberOfRows){
      numberOfRows = $(".file-container>div").length;
      if(numberOfRows>0) {
        $('.fileinput-upload').show('fast');
      } else {
        $('.fileinput-upload').hide('fast');
      }
    }
  });

  // Upload "All" button handler (click all upload buttons programmatically)
  $('.fileinput-upload').click(function(e) {
    e.preventDefault();
    $('.btn-upload').each(function(index, item) {
      $(item).click();
    });
  });

  // Clear the upload file list
  $('.fileinput-clearlist').click(function(e) {
    clearFileList();
  });

});

// Drag&Drop Helper
$(document).bind('dragover', function (e) {

  var dropzone = $('.dropzone')
    , timeout = window.dropzoneTimeout;
  
  // DragIN
  if (!timeout) {
    dropzone.fadeIn("fast");
  } else {
    clearTimeout(timeout);
  }

  // DragOUT
  window.dropzoneTimeout = setTimeout(function () {
    window.dropzoneTimeout = null;
    dropzone.fadeOut("fast");
  }, 100);
  
});
