This project uses Open Layers, Google Maps and CouchDB (with geocouch) to present a map of the locations of poetry posts in Portland, Oregon. You can see the live map here:

http://poetrybox.info

## History

This project started with a copy of Max Ogden's PDXAPI geobrowser.js, available on GitHub here:

https://github.com/maxogden/geobrowser

Specifically, this commit:

https://github.com/maxogden/geobrowser/commit/30b29fc4f6d2434d1dc8e0ca14aa173e94fe3569

My goal was to make a dataset-specific version of the geobrowser, so it doesn't really make sense to push most of the changes back into the original codebase, unless they would improve that code.

The key files are index.html, style.css and geobrowser.js.

I started integrating a fancybox jQuery plug-in, but was never happy with the way it worked.

## Significant Changes from the Original

* New Google Maps API key specific to poetrybox.info
* Renamed preview.html to index.html, customized a lot of headlines and text
* Enhanced zoom handling, including independent latitude and longitude deltas instead of "fifteenMiles"-based calculation
* Added the option to zoom to specific neighborhoods or regions
* Added custom placemark icons
* Reorganized the stylesheet

## Known Issues and Next Steps

* The UI needs major improvements to be effective for this website's intended audience.
* It doesn't work on IE at all, and it's problematic on touch devices.
* I'll probably go in a different direction and try [Leaflet](http://leaflet.cloudmade.com/) next.

