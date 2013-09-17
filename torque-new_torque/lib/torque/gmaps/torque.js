(function(exports) {

if(typeof(google) === 'undefined' || typeof(google.maps) === 'undefined') return;

function GMapsTorqueLayer(options) {
  var self = this;
  this.key = 0;
  this.cartocss = null;
  this.ready = false;
  this.options = _.extend({}, options);
  _.defaults(this.options, {
    provider: 'sql_api',
    renderer: 'point',
    resolution: 2,
    steps: 100
  });

  this.animator = new torque.Animator(function(time) {
    var k = time | 0;
    if(self.key !== k) {
      self.setKey(k);
    }
  }, this.options);

  this.play = this.animator.start.bind(this.animator);
  this.stop = this.animator.stop.bind(this.animator);
  this.pause = this.animator.pause.bind(this.animator);
  this.toggle = this.animator.toggle.bind(this.animator);

  CanvasLayer.call(this, {
    map: this.options.map,
    //resizeHandler: this.redraw,
    animate: false,
    updateHandler: this.render,
    readyHandler: this.initialize
  });

}

/**
 * torque layer
 */
GMapsTorqueLayer.prototype = _.extend({}, 
  CanvasLayer.prototype,
  torque.GMapsTileLoader.prototype,
  torque.Event,
  {

  providers: {
    'sql_api': torque.providers.json,
    'url_template': torque.providers.jsonarray
  },

  renderers: {
    'point': torque.renderer.Point,
    'pixel': torque.renderer.Rectangle
  },

  initialize: function() {
    var self = this;

    this.onTileAdded = this.onTileAdded.bind(this);

    this.provider = new this.providers[this.options.provider](this.options);
    this.renderer = new this.renderers[this.options.renderer](this.getCanvas(), this.options);

    this._initTileLoader(this.options.map, this.getProjection());

    if (this.cartocss) {
      this.renderer.setCartoCSS(this.cartocss);
    }

  },

  getCanvas: function() {
    return this.canvas;
  },

    // for each tile shown on the map request the data
  onTileAdded: function(t) {
    var self = this;
    this.provider.getTileData(t, t.zoom, function(tileData) {
      self._tileLoaded(t, tileData);
      self.redraw();
    });
  },

  /**
   * render the selectef key
   * don't call this function directly, it's called by
   * requestAnimationFrame. Use redraw to refresh it
   */
  render: function() {
    var t, tile, pos;
    var canvas = this.canvas;
    canvas.width = canvas.width;
    var ctx = canvas.getContext('2d');

    // renders only a "frame"
    for(t in this._tiles) {
      tile = this._tiles[t];
      pos = this.getTilePos(tile.coord);
      ctx.setTransform(1, 0, 0, 1, pos.x, pos.y);
      this.renderer.renderTile(tile, this.key, pos.x, pos.y);
    }
  },

  /**
   * set key to be shown. If it's a single value
   * it renders directly, if it's an array it renders
   * accumulated
   */
  setKey: function(key) {
    this.key = key;
    this.animator.step(key);
    this.redraw();
    this.fire('change:time', { time: this.getTime(), step: this.key });
  },

  /**
   * helper function, does the same than ``setKey`` but only 
   * accepts scalars.
   */
  setStep: function(time) {
    if(time === undefined || time.length !== undefined) {
      throw new Error("setTime only accept scalars");
    }
    this.setKey(time);
  },

  /**
   * transform from animation step to Date object 
   * that contains the animation time
   *
   * ``step`` should be between 0 and ``steps - 1`` 
   */
  stepToTime: function(step) {
    if (!this.provider) return 0;
    var times = this.provider.getKeySpan();
    var time = times.start + (times.end - times.start)*(step/this.options.steps);
    return new Date(time*1000);
  },

  /**
   * returns the animation time defined by the data
   * in the defined column. Date object
   */
  getTime: function() {
    return this.stepToTime(this.key);
  },



  /**
   * set the cartocss for the current renderer
   */
  setCartoCSS: function(cartocss) {
    if (!this.renderer) {
      this.cartocss = cartocss;
      return this;
    }
    this.renderer.setCartoCSS(cartocss);
    this.redraw();
    return this;
  },

  redraw: function() {
    this.scheduleUpdate();
  }

});



function GMapsTiledTorqueLayer(options) {
  this.options = _.extend({}, options);
  CanvasTileLayer.call(this, this._loadTile.bind(this), this.drawTile.bind(this));
  this.initialize(options);
}

GMapsTiledTorqueLayer.prototype = _.extend({}, CanvasTileLayer.prototype, {

  providers: {
    'sql_api': torque.providers.json,
    'url_template': torque.providers.JsonArray
  },

  renderers: {
    'point': torque.renderer.Point,
    'pixel': torque.renderer.Rectangle
  },

  initialize: function(options) {
    var self = this;
    this.key = 0;

    this.options.renderer = this.options.renderer || 'pixel';
    this.options.provider = this.options.provider || 'sql_api';

    this.provider = new this.providers[this.options.provider](options);
    this.renderer = new this.renderers[this.options.renderer](null, options);

  },

  _tileLoaded: function(tile, tileData) {
    tile.data = tileData;
    this.drawTile(tile);
  },

  _loadTile: function(tile, coord, zoom) {
    var self = this;
    var limit = 1 << zoom;
    // wrap tile
    var wrappedCoord = {
      x: ((coord.x % limit) + limit) % limit,
      y: coord.y
    };

    this.provider.getTileData(wrappedCoord, zoom, function(tileData) {
      self._tileLoaded(tile, tileData);
    });
  },

  drawTile: function (tile) {
    var canvas = tile.canvas;
    if(!tile.data) return;
    canvas.width = canvas.width;

    this.renderer.setCanvas(canvas);

    var accum = this.renderer.accumulate(tile.data, this.key);
    this.renderer.renderTileAccum(accum, 0, 0);
  },

  setKey: function(key) {
    this.key = key;
    this.redraw();
  },

  /**
   * set the cartocss for the current renderer
   */
  setCartoCSS: function(cartocss) {
    if (!this.renderer) throw new Error('renderer is not valid');
    return this.renderer.setCartoCSS(cartocss);
  }

});

exports.torque.GMapsTiledTorqueLayer = GMapsTiledTorqueLayer;
exports.torque.GMapsTorqueLayer = GMapsTorqueLayer;

})(typeof exports === "undefined" ? this : exports);
