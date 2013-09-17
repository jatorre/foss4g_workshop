(function(exports) {

  exports.torque = exports.torque || {};

  var requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame || function(c) { setTimeout(c, 16); }

  var cancelAnimationFrame = window.requestAnimationFrame || window.mozCancelAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame || function(c) { cancelTimeout(c); };

  /**
   * options:
   *    animationDuration in seconds
   *    animationDelay in seconds
   */
  function Animator(callback, options) {
    if(!options.steps) {
      throw new Error("steps option missing")
    }
    this.options = options;
    this.running = false;
    this._tick = this._tick.bind(this);
    this._t0 = +new Date();
    this.callback = callback;
    this._time = 0.0;
    _.defaults(this.options, {
      animationDelay: 0,
      maxDelta: 0.2,
      loop: true
    });

    this.domainInv = torque.math.linear(this.options.animationDelay, this.options.animationDelay + this.options.animationDuration);
    this.domain = this.domainInv.invert();
    this.range = torque.math.linear(0, this.options.steps);
    this.rangeInv = this.range.invert();
  }


  Animator.prototype = {

    start: function() {
      this.running = true;
      requestAnimationFrame(this._tick);
    },

    stop: function() {
      this.pause();
      this._time = 0;
      var t = this.range(this.domain(this._time));
      this.callback(t);
    },

    toggle: function() {
      if (this.running) {
        this.pause()
      } else {
        this.start()
      }
    },

    step: function(s) {
      if(arguments.length === 0) return this.range(this.domain(this._time));
      this._time = this.domainInv(this.rangeInv(s));
    },

    pause: function() {
      this.running = false;
      cancelAnimationFrame(this._tick);
    },

    _tick: function() {
      var t1 = +new Date();
      var delta = (t1 - this._t0)*0.001;
      // if delta is really big means the tab lost the focus
      // at some point, so limit delta change
      delta = Math.min(this.options.maxDelta, delta);
      this._t0 = t1;
      this._time += delta;
      var t = this.range(this.domain(this._time));
      this.callback(t);
      if(t >= this.options.steps) {
        this._time = 0;
      }
      if(this.running) {
        requestAnimationFrame(this._tick);
      }
    }

  };

  exports.torque.Animator = Animator;



})(typeof exports === "undefined" ? this : exports);
