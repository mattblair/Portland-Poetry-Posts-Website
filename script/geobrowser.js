var GeoJSONHelper = function() {
  return {
    collect_geometries : function(geometries) {
      if (geometries.type == 'GeometryCollection')
        return geometries;
      return [{"type" : "GeometryCollection", "geometries" : geometries }]
    },
    collect_features : function(features){
      if (features.type == 'FeatureCollection')
        return features;
      return { "type" : "FeatureCollection", "features" : features }
    },
    pdxapi_feature_collection : function(data) {
      var features = $.map(data.rows, function(row, idx){
        return {
          geometry: row.value.geometry,
          type: 'Feature',
          properties: {id: row.id}
        };
      });
      return GeoJSONHelper.collect_features(features);
    }
  }
}();

var Map = function() {
  return {
    geocoder: new GClientGeocoder(),
    //changed url and db here...
    couchUrl: "http://elsewise.couchone.com/",
    currentDataset: "poetry_posts110718",
    fetchFeatures: function() {
      Indicator.show();
      // for debugging only!!!
      //$('#tagline').html("<h3>Zoom is: " + getZoom() + "</h3>");
      
      $.ajax({
        url: Map.couchUrl + Map.currentDataset + "/_design/geojson/_spatial/points",
        dataType: 'jsonp',
        data: {
          "bbox": Map.container.getExtent().transform( proj900913, proj4326 ).toBBOX()
        },
        success: function(data){
          Indicator.hide();
          var feature_collection = GeoJSONHelper.pdxapi_feature_collection(data);
          Map.drawFeature(Map.geojson_format.read(feature_collection));
        }
      })
    },
    formatMetadata: function(data) {
      
      //Example: out = '<img src="http://elsewise.couchone.com/poetry_posts/b916e524b2e1f24e72ac7a81aa4c34ca/1924NE36th-lf.jpg" /> ';
      if (data.imageURL) { // add image tag here...
          out = '<img id="postphoto" src="' + data.imageURL + '" /> <p id="photocredit">Photo by ' + data.photoCredit + '</p>';
          /*if (data.photoCredit) {
              out = out + '<p id="photocredit">Photo by ' + data.photoCredit '</p>';
          }*/
      } else {
          out = '<p id="nophoto">(No image yet...)</p>';
      }
      out = out + '<p id="address">' + data.addr1 + ' <br />';
      out = out + data.city + ', ' + data.state + ' ' + data.zip + '</p>';
      // check for null
      if (data.tipsForFinding) {
          out = out + '<p><strong>How to find it:</strong> ' + data.tipsForFinding + '</p>';
      }
      out = out + '<p id="last-updated"><em>Last Updated: ' + data.dateModified + '</em></p>';
      return out;
    },
    fetchFeatureMetadata: function(feature) {
      // All we really want here is the fade...
      // Map.clearMetadata(feature);
      $('#metadata').fadeOut('slow');
      $.ajax({
        url: Map.couchUrl + Map.currentDataset + "/" + feature.attributes.id,
        dataType: 'jsonp',
        success: function(data) {
          //already faded in clearMetaData, so don't fade again after arrival
          //$('#metadata').fadeOut('fast'); 
          $('#metadata').html("<h3>About This Post</h3>"+
            Map.formatMetadata(data));
          $('#metadata').fadeIn('300');
        }
      });
    },
    clearMetadata: function(arg) {
      //$('#metadata').html('<h3 id="choose-note">(Select a post...)</h3>');
      $('#metadata').fadeOut('slow');
    },
    /*
    fetchDatasetMetadata: function(dataset) {
      Map.clearMetadata(dataset);
      $.ajax({
        url: Map.couchUrl + Map.currentDataset + "/placeholder_metadata",
        dataType: 'jsonp',
        success: function(data){
          $('#metadata').html("<h3>Dataset Metadata</h3>"+
            Map.formatMetadata(data)
          );
        }
      });
    },
    */

    drawFeature: function(features) {
      $.each(features, function(idx, item) {
        item.geometry.transform(proj4326, proj900913);
      });
      Map.vector_layer.destroyFeatures();
      Map.vector_layer.addFeatures(features);
    }
  }
}();

var Indicator = {
  show: function(text) {
    var top = $('#map').height() / 2 - 50;
    var left = $('#map').width() / 2 - 50;
    $('#loader').show().css({'top': top, 'left': left});
  },
  hide: function() {
    $('#loader').hide();
  }
}

var showing_layers = [];

$(function() {
  $('.geocoder_form').submit(function(){
    Map.geocoder.getLatLng(this.address.value + " portland, oregon", function(point) {
      if (!point) {
        alert(address + " not found");
      } else {
        var newCenter = new OpenLayers.LonLat(point.x, point.y);
        newCenter.transform( proj4326, proj900913 )
        Map.container.setCenter(newCenter, 16);
      }
    });
    return false;
  })
  
  OpenLayers.ImgPath="themes/dark/"
  // don't need database list
  /*
  $.ajax({
    url: "http://maxogden.couchone.com/_all_dbs",
    dataType: 'jsonp',
    success: function(databases){
      var dbList = $('#databases');
      $.each(databases.sort(), function(index, database){
        if (database[0] !== "_" && database !== "pdxapi") {
          dbList.append('<li>' + database + '</li>');
        }
      });
      // commented so it doesn't over-write my hardcoded database
      //$('#databases li:first').click();
    }
  });*/

  proj900913 = new OpenLayers.Projection("EPSG:900913"); //Spherical mercator used for google maps
  proj4326 = new OpenLayers.Projection("EPSG:4326"); 
  // original values from geobrowser.js
  //var lat = 45.52811798237782;
  //var lon = -122.66733169555664;
  // the center of the Poetry Posts dataset
  var centerLatitude = 45.527849;
  var centerLongitude = -122.643659;
  var pdxCentroidRaw = new OpenLayers.LonLat(centerLatitude, centerLongitude);
  var pdxCentroidTransformed = pdxCentroidRaw.clone();
  pdxCentroidTransformed.transform( proj4326, proj900913 ); // for use later
  // NOTE: 0.03 != 15 miles! 
  // In this area, 0.03 degrees of latitude is about 2.1 miles, 0.03 of longitude is about 1.5 miles
  // this would yield a very small restrictedExtent, which is why you keep bumping up against the edges.
  /*
  var fifteenMiles = 0.03; 
  var pdxLL = new OpenLayers.LonLat(lon - fifteenMiles, lat - fifteenMiles);
  var pdxUR = new OpenLayers.LonLat(lon + fifteenMiles, lat + fifteenMiles);
  */
  // Actual Bounding Box for this Dataset
  // Lower Left: -122.736635, 45.475418
  // Upper Right: -122.549402, 45.566659
  
  // Replacing fifteenMiles with two variables so they can be adjusted independently:
  var latitudeDelta = 0.1;
  var longitudeDelta = 0.12;
  var pdxLL = new OpenLayers.LonLat(centerLongitude - longitudeDelta, centerLatitude - latitudeDelta);
  var pdxUR = new OpenLayers.LonLat(centerLongitude + longitudeDelta, centerLatitude + latitudeDelta);
  pdxLL.transform( proj4326, proj900913 ); // transform is in-place. Need to clone to put it into a different var.
  pdxUR.transform( proj4326, proj900913 );
  Map.options = {
    maxExtent: new OpenLayers.Bounds(pdxLL.lon,pdxLL.lat, pdxUR.lon,pdxUR.lat),    
    restrictedExtent: new OpenLayers.Bounds(pdxLL.lon,pdxLL.lat, pdxUR.lon,pdxUR.lat),    
    projection: proj900913,
    displayProjection: proj4326,
    tileSize: new OpenLayers.Size(256, 256),
    controls: [
      new OpenLayers.Control.Navigation(),
      new OpenLayers.Control.PanZoomBar(),
      new OpenLayers.Control.KeyboardDefaults()
    ]
  };
  Map.container = new OpenLayers.Map('map', Map.options);
  Map.gmap = new OpenLayers.Layer.Google("Google Streets", {"sphericalMercator": true, MIN_ZOOM_LEVEL: 10, MAX_ZOOM_LEVEL: 18}); // min was 14, max was 21
  Map.container.addLayer(Map.gmap);

  Map.styleMap = new OpenLayers.StyleMap({
    'default': OpenLayers.Util.applyDefaults({
      graphic: true,
      externalGraphic: "http://poetrybox.info/images/post-icon-whitefill.png",
      graphicOpactiy: 1,
      graphicXOffset: -15,
      graphicYOffset: -25,
      graphicWidth: 30,
      graphicHeight: 30
    }),
    'select': new OpenLayers.Style({
      graphic: true,
      externalGraphic: "http://poetrybox.info/images/post-icon-greenfill.png",
      graphicOpactiy: 1,
      graphicXOffset: -15,
      graphicYOffset: -25,
      graphicWidth: 30,
      graphicHeight: 30
    }),
    'temporary': new OpenLayers.Style({
      graphic: true,
      externalGraphic: "http://poetrybox.info/images/post-icon.png",
      graphicOpactiy: 1,
      graphicXOffset: -15,
      graphicYOffset: -25,
      graphicWidth: 30,
      graphicHeight: 30
    }),
  });

  Map.vector_layer = new OpenLayers.Layer.Vector("GeoJSON", {
    projection: proj4326, 
    styleMap: Map.styleMap
  });
  Map.container.addLayer(Map.vector_layer);

  var highlightCtrl = new OpenLayers.Control.SelectFeature(Map.vector_layer, {
      hover: true,
      highlightOnly: true,
      renderIntent: "temporary",
  });

  var selectCtrl = new OpenLayers.Control.SelectFeature(Map.vector_layer, {
      onSelect: Map.fetchFeatureMetadata,
      onUnselect: Map.clearMetadata, 
  });

  Map.container.addControl(highlightCtrl);
  Map.container.addControl(selectCtrl);

  highlightCtrl.activate();
  selectCtrl.activate();

  Map.geojson_format = new OpenLayers.Format.GeoJSON();     

  // Changed center from -122.6762071,45.5234515 in original
  // shouldn't this be transformed?
  var defaultCentroid = new OpenLayers.LonLat(-122.6303,45.5232)
  defaultCentroid.transform( proj4326, proj900913 )
  Map.container.setCenter(defaultCentroid, 3); // was 3, then changed to 15, but after other changes, that's way out...
  Map.container.events.register( 'moveend', this, function(){ Map.fetchFeatures() });

  if (OpenLayers.Control.MultitouchNavigation) {
    var touchControl = new OpenLayers.Control.MultitouchNavigation();
    Map.container.addControl(touchControl);
  }

  // don't want an empty metadata box
  Map.clearMetadata();
  
  // fetch after everything else is set up...
  Map.fetchFeatures();

  
  // don't want to show a database list
  /*
  $('#databases li').live('click', function(){
    var dataset = $(this).text();
    $('.selected').removeClass('selected');
    $(this).addClass('selected');
    Map.currentDataset = dataset;
    Map.fetchDatasetMetadata(dataset);
    Map.fetchFeatures();
  });*/
  
  // Instead, a region list based on database list:
  $('#regions li').live('click', function(){

      var newRegion = $(this).text();

      // init defaults
      var zoomViewDelta = 0.01;
      var areaCentroid = new OpenLayers.LonLat(-122.650253,45.541930);
      
      switch (newRegion) {
         case 'Irvington': 
           areaCentroid = new OpenLayers.LonLat(-122.650253,45.541930);
           break;
         case 'Grant Park':
           areaCentroid = new OpenLayers.LonLat(-122.62588, 45.54250);
           zoomViewDelta = 0.007;
           break;
         case 'Mount Tabor':
           areaCentroid = new OpenLayers.LonLat(-122.59425, 45.51208);
           break;
         case 'Westside':
           areaCentroid = new OpenLayers.LonLat(-122.696431, 45.522983);
           zoomViewDelta = 0.014; // What I want is between zoom levels. 0.012 is too close, this is to wide.
           break;  
         default:  // All of Portland
           // too wide
           // Map.container.zoomToMaxExtent(); 
           areaCentroid = new OpenLayers.LonLat(-122.6303,45.5232);
           zoomViewDelta = 0.07; 
           break;
      }
        
      // Zoom to the newly defined extent
      var areaLL = new OpenLayers.LonLat(areaCentroid.lon - zoomViewDelta,areaCentroid.lat - zoomViewDelta);
      var areaUR = new OpenLayers.LonLat(areaCentroid.lon + zoomViewDelta,areaCentroid.lat + zoomViewDelta);
      areaLL.transform( proj4326, proj900913 ); // happens in-place
      areaUR.transform( proj4326, proj900913 );
      var newAreaExtent = new OpenLayers.Bounds(areaLL.lon, areaLL.lat, areaUR.lon, areaUR.lat );
      Map.container.zoomToExtent(newAreaExtent);
      
      // clear specific information about a post
      Map.clearMetadata();
      
      // refresh the points for the new area
      Map.fetchFeatures();
    });
  
});
