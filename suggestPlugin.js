(function(name, definition) {
    if (typeof module != 'undefined') module.exports = definition();
    else if (typeof define == 'function' && typeof define.amd == 'object') define(definition);
    else this[name] = definition();
}('suggestPlugin', function() {
  'use strict';

  // extend objects
  function extend(){
    for(var i=1; i<arguments.length; i++) {
      for(var key in arguments[i]) {
        if(arguments[i].hasOwnProperty(key)) {
          arguments[0][key] = arguments[i][key];
        }
      }
    }
    return arguments[0];
  }

  // CustomEvent polyfill
  function CustomEvent(event, params ){
    params = params || { bubbles: false, cancelable: false, detail: undefined };
    var evt = document.createEvent( 'CustomEvent' );
    evt.initCustomEvent( event, params.bubbles, params.cancelable, params.detail );
    return evt;
  }
  CustomEvent.prototype = window.Event.prototype;
  window.CustomEvent = CustomEvent;


  var trigger     = '[data-suggest]',
      optionsAttr = 'data-suggest',
      urlAttr     = 'data-suggest-url',

      // Template of an item. Ex: '<span class="type">+<% Type %>+</span> - +<% Title %>'
      // Static contents and variables must be separate by '+'
      // variables must be put inside <% ... %>
      // When no template is sepcified, the matched value is simply put into the list
      templateAttr= 'data-suggest-template',

      defaults    = {
                      matchWith      : 'label',               // match input with that
                      minLength      : 1,                     // request after [minLength] characters
                      wrapperClass   : 'suggest-wrapper',     // class for the div that wrap both input and results
                      activeClass    : 'active',              // class for active items (hover+active)
                      resultsClass   : 'suggest-list',        // class to the results list element
                      itemClass      : 'suggest-list__item',  // class on each items
                      visibilityClass: 'is-opened'            // class to define results list visibility
                    };

  function Suggest( el, opt ) {
    this.element    = el;

    var attrOptions = JSON.parse(this.element.getAttribute(optionsAttr));
    this.options    = extend({}, defaults, opt, attrOptions);

    this.data       = [];     // response from the ajax call
    this.tempVal    = "";     // when navigating with keyboard, store enlighted item
    this.opened     = false;
    this.pointer    = -1;     // active item in list (-1 = no active item)
    this.arrayName  = this.options.arrayName || false;      // if needed, precise the name of the data array in response object
    this.url        = this.element.getAttribute(urlAttr);
    this.request    = new XMLHttpRequest();
    this.template   = this.element.getAttribute(templateAttr) || '<% '+ this.options.matchWith +' %>';  // custom template or default
    this.keyNames   = {
      40: 'down',
      38: 'up',
      13: 'enter',
      27: 'esc',
      37: 'left',
      39: 'right',
      9:  'tab',
      16: 'shift'
    };  // because I never remember keyCodes...

    this.init();
  }


  Suggest.prototype = {
    init: function() {
      var that = this;

      that._prepareDOM()
          ._keyboardNavigation();

      // close on document.body click
      document.body.addEventListener('click', function(e) {
        if (that.opened && e.target !== that.input) {
          that._undoPreSuggestion()
              ._closeSuggestions();
        }
      });

      // input focus should open results list
      that.input.addEventListener('focus', function(e){
        if (!that.opened && typeof that.suggestions !== 'undefined' && that.suggestions.length > 0) {
          that._displaySuggestions(that.value);
        }
      });

      // click on an item
      that.results.addEventListener("click", function(e) {
        var target = e.target;

        while (target.tagName !== 'LI') {
          target = target.parentNode;
          if (target === this) return;
        }

        that._insertSuggestion( target.id );
      });

      // create custom events for developpers use
      that._customEvents();
    },

    _prepareDOM: function() {
      // prepare input
      this.input = this.element.querySelector('input');
      this.input.setAttribute('role', 'combobox');
      this.input.setAttribute('aria-autocomplete', 'list');
      this.input.setAttribute('autocomplete', 'off');

      // create wrapper container
      var wrapper = document.createElement('div');
          wrapper.className = this.options.wrapperClass;

      this.input.parentNode.insertBefore(wrapper, this.input);
      wrapper.appendChild(this.input);

      // prepare results box
      var results = document.createElement('ul');
          results.setAttribute('role', 'listbox');

      var resultsWrapper = document.createElement('div');
          resultsWrapper.className = this.options.resultsClass;
          resultsWrapper.style.visibility = 'hidden';
          resultsWrapper.appendChild(results);

      wrapper.appendChild(resultsWrapper);
      this.results = resultsWrapper;

      return this;
    },

    _customEvents: function(){
      this.suggestRequest  = new CustomEvent('suggestRequest');
      this.suggestOpen     = new CustomEvent('suggestOpen');
      this.suggestClose    = new CustomEvent('suggestClose');
      this.suggestSelected = new CustomEvent('suggestSelected');
    },

    _keyboardNavigation: function() {
      var that = this,
          timeout;

      // Prevent form submit when navigating in suggestions
      that.input.addEventListener('keydown', function(e) {
        if (that.keyNames[e.keyCode] === 'enter' && that.pointer !== -1) {
          e.preventDefault();
        }
      });

      that.input.addEventListener('keyup', function(e) {
        e = e || window.event;
        var keycode = e.keyCode,
            value   = this.value.trim();

        switch(that.keyNames[keycode]) {
          case 'down':
            that.opened ? that._navigation(keycode) : that._displaySuggestions(value);
            break;

          case 'up':
            if (that.opened) {
              that._navigation(keycode);
            }
            break;

          case 'enter':
            if (that.pointer !== -1) {
              that._insertSuggestion();
            }
            break;

          case 'esc':
            that._undoPreSuggestion()
                ._closeSuggestions();
            break;

          // prevent actions on those keys
          case 'left':
          case 'right':
          case 'tab':
          case 'shift':
            break;

          default:
            if (value.length > that.options.minLength) {
              that.request.abort();
              clearTimeout(timeout);
              timeout = setTimeout(function() {
                that._callData(value, that._displaySuggestions);
              }, 350);

            } else {
              that.data = [];
              that._closeSuggestions();
            }
            break;
        }
      });

      return this;
    },

    _openSuggestions: function() {
      if (!this.opened) {
        this.element.dispatchEvent(this.suggestOpen);
        this.results.classList.add(this.options.visibilityClass);
        this.results.style.visibility = 'visible';
        this.pointer  = -1;
        this.opened   = true;
      }

      return this;
    },

    _closeSuggestions: function() {
      if (this.opened) {
        this.element.dispatchEvent(this.suggestClose);
        this.results.classList.remove(this.options.visibilityClass);
        this.results.style.visibility = 'hidden';
        this.pointer  = -1;
        this.opened   = false;
      }

      return this;
    },

    _navigation: function(keycode) {
      if (this.opened) {
        this._removeFocus();

        if (this.keyNames[keycode] === 'down') {
          this.pointer++;

          // active item when inside the list
          if (this.pointer > -1 && this.pointer <= this.suggestions.length -1) {
            this._getFocus()
                ._preSuggestion();
          }

          // loop back into the input field
          if (this.pointer > this.suggestions.length -1) {
            this._undoPreSuggestion(); // pointer set to -1
          }

        } else if (this.keyNames[keycode] === 'up') {
          this.pointer--;

          // when -1, we are in the input field
          if (this.pointer === -1) {
            this._undoPreSuggestion(); // pointer set to -1
            return;
          }

          // loop to the end of the list when already in the input field
          if (this.pointer < -1) {
            this.pointer = this.suggestions.length -1;
          }

          // active item when inside the list
          this._getFocus()
              ._preSuggestion();

        }
      }
    },

    _callData: function(string, callback){
      var that = this;

      that.element.dispatchEvent(that.suggestRequest);

      callback = callback.bind(that);

      that.request.open("GET", that.url + string, true);
      that.request.onreadystatechange = function (e) {
        if (this.readyState !== 4 || this.status !== 200) { return; }
        callback(string, JSON.parse(  this.responseText));
      };
      that.request.onerror = function(e){
        console.log('error', e);
      };
      that.request.send();

      return that.request;
    },

    _displaySuggestions: function(string, data) {
      var that = this;

      that.tempVal = that.input.value;

      if (typeof data !== 'undefined') {
        // if it's directly an array of results
        // -> [{"bla": "xxx"}, {"bla": "xxx"}, {"bla": "xxx"}]
        if (data.length) {
          that.data = data;

        // if the array is a value, arrayName option is required
        // -> {"items": [{"bla": "xxx"}, {"bla": "xxx"}, {"bla": "xxx"}]}
        } else {
          if (that.arrayName) {
            that.data = data[that.arrayName];
          } else {
            console.log('You must specify the arrayName option to find data', 'data-suggest=\"{"arrayName": "Search", "matchWith": "Title"}\" for exemple');
          }
        }
      }

      if (string !== '' && typeof that.data !== 'undefined' && that.data.length > 0) {
        // directly return if only 1 entry  and if === user entry
        if (that.data.length === 1 && string === that.data[0][that.options.matchWith]) { return; }

        // generate results list
        var template = '';

        for (var i = 0, len = that.data.length; i < len; i++) {
          template += '<li id="'+ i +'" role="option" class="'+ that.options.itemClass +'">';
          template += '  <a href="#" type="button" tabindex="-1">';
          template +=      that._generateItem(i)(that);
          template += '  </a>';
          template += '</li>';
        }

        that.results.querySelector('ul').innerHTML = template;
        that.suggestions = that.results.querySelectorAll('li'); // keep suggestions list

        that._openSuggestions();

      } else {
        that._closeSuggestions();
      }
    },

    _generateItem: function(index) {
      var item      = this.template,
          reg       = /<%([^%>]+)?%>/g,
          splitItem = item.split('+'),
          match;

      for (var i = 0, len = splitItem.length; i < len; i++) {
        match = reg.exec(splitItem[i])

        if (match === null) {
          splitItem[i] = "'"+ splitItem[i] +"'";
        } else {
          splitItem[i] = splitItem[i].replace(match[0], 'that.data['+ index +']["'+ match[1].trim() +'"]');
        }
      }

      return new Function('that', 'return ' + splitItem.join(" + "));
    },

    _preSuggestion: function() {
      // prefill the input with selected suggestion
      this.input.value = this.data[this.pointer][this.options.matchWith];
      return this;
    },

    _undoPreSuggestion: function() {
      if (this.opened) {
        // revert previous input value after canceling _preSuggestion
        this.input.value = this.tempVal;

        // sometimes, input if filled by that empty string...
        setTimeout(function(){
          this.tempVal = "";
        }, 0);

        if (typeof this.suggestions !== 'undefined' && this.suggestions.length !== 0) {
          this.suggestions[this.suggestions.length -1].classList.remove(this.options.activeClass);
          this.pointer = -1;
        }
      }

      return this;
    },

    _insertSuggestion: function(id) {
      this.input.value = id ? this.data[id][this.options.matchWith] : this.data[this.pointer][this.options.matchWith];
      this.data = [];
      this._closeSuggestions();
      this.element.dispatchEvent(this.suggestSelected);
    },

    _getFocus: function() {
      this.suggestions[this.pointer].classList.add(this.options.activeClass);
      return this;
    },

    _removeFocus: function() {
      if (typeof this.suggestions[this.pointer] !== 'undefined') {
        this.suggestions[this.pointer].classList.remove(this.options.activeClass);
      }
      return this;
    }
  };


  var suggest = function(opt){
    var elements = document.querySelectorAll(trigger);
    for (var i = 0, len = elements.length; i < len; i++) {
      if (!elements[i].dataset.plugin_suggest) {
        elements[i].dataset.plugin_suggest = new Suggest(elements[i], opt);
      }
    }
  };

  return suggest;
}));