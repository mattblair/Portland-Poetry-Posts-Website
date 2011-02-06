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
    //change url and db here...
    couchUrl: "http://elsewise.couchone.com/",
    currentDataset: "poetry_posts",
    fetchFeatures: function() {
      Indicator.show();
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
      
      //out = '<img src="http://elsewise.couchone.com/poetry_posts/b916e524b2e1f24e72ac7a81aa4c34ca/1924NE36th-lf.jpg" /> ';
      if (data.imageURL) { // add image tag here...
          out = '<img id="postphoto" src="' + data.imageURL + '" /> ';
      } else {
          out = '<p>(No image yet...)</p>';
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
      Map.clearMetadata(feature);
      $.ajax({
        url: Map.couchUrl + Map.currentDataset + "/" + feature.attributes.id,
        dataType: 'jsonp',
        success: function(data) {
          // TODO: Format using formatting func
          $('#metadata').html("<h3>About This Post</h3>"+
            Map.formatMetadata(data));
        }
      });
    },
    clearMetadata: function(arg) {
      $('#metadata').html('');
    },
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
  var lat = 45.52811798237782;
  var lon = -122.66733169555664;
  var fifteenMiles = 0.03;
  var pdxLL = new OpenLayers.LonLat(lon - fifteenMiles, lat - fifteenMiles);
  var pdxUR = new OpenLayers.LonLat(lon + fifteenMiles, lat + fifteenMiles);
  pdxLL.transform( proj4326, proj900913 );
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
      fillOpacity: 0.4, 
      strokeColor: "black", 
      strokeWidth: 2,
      pointRadius: 7
    }),
    'select': new OpenLayers.Style({
      strokeColor: "#FF0000",
    }),
    'temporary': new OpenLayers.Style({
      strokeColor: "#00FF00",
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
  //shouldn't this be transformed?
  var defaultCentroid = new OpenLayers.LonLat(-122.6303,45.5232)
  defaultCentroid.transform( proj4326, proj900913 )
  Map.container.setCenter(defaultCentroid, 3); // was 3, then changed to 15, but after other changes, that's way out...
  Map.container.events.register( 'moveend', this, function(){ Map.fetchFeatures() });

  if (OpenLayers.Control.MultitouchNavigation) {
    var touchControl = new OpenLayers.Control.MultitouchNavigation();
    Map.container.addControl(touchControl);
  }

  // fetch after everything else is set up...
  Map.fetchFeatures();

  
  // removing database click list
  /*
  $('#databases li').live('click', function(){
    var dataset = $(this).text();
    $('.selected').removeClass('selected');
    $(this).addClass('selected');
    Map.currentDataset = dataset;
    Map.fetchDatasetMetadata(dataset);
    Map.fetchFeatures();
  });*/
  
  // based on database click list:
  $('#regions li').live('click', function(){
      var newRegion = $(this).text();
      
      // set default values or Portland -- should use defaultCentroid, but that's been transformed already
      var newCenter = new OpenLayers.LonLat(-122.6303,45.5232);
      var newZoomLevel = 12;
      // replace with conditional based on newRegion
      
      if (newRegion == 'Irvington') {      
          // Irvington Centroid:  -122.650253, 45.541930
          newCenter = new OpenLayers.LonLat(-122.650253, 45.541930);
          newZoomLevel = 3; // was 20
      }
      
      // Grant Park Centroid: -122.62588, 45.54250
      if (newRegion == 'Grant Park') {
          newCenter = new OpenLayers.LonLat(-122.62588, 45.54250);
          newZoomLevel = 17;
      }
      
      // Mount Tabor Centroid: -122.59425, 45.51208
      if (newRegion == 'Mount Tabor') {
          newCenter = new OpenLayers.LonLat(-122.59425, 45.51208);
          newZoomLevel = 17;
      }
      
      // Westside Centroid: -122.696431, 45.522983
      if (newRegion == 'Westside') {
          newCenter = new OpenLayers.LonLat(-122.696431, 45.522983);
          newZoomLevel = 17;
      }
      
      // Southeast Centroid?
      
      
      // values need to be transformed to the maps's projection
      newCenter.transform( proj4326, proj900913 )
      Map.container.setCenter(newCenter, newZoomLevel); // was hard-coded to 16
      
      // refresh the points for the new area
      Map.fetchFeatures();
    });
  
});
