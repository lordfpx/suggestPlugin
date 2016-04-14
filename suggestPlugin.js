var suggestPlugin = (function(){
  'use strict';

  function extend(){
    for(var i = 1, len = arguments.length; i < len; i++) {
      for(var key in arguments[i]) {
        if(arguments[i].hasOwnProperty(key)) {
          arguments[0][key] = arguments[i][key];
        }
      }
    }
    return arguments[0];
  }

  var trigger     = '[data-suggest]',
      urlAttr     = 'data-suggest-url',
      optionsAttr = 'data-suggest',
      defaults    = {
                      label          : 'label',               // match input with that
                      minLength      : 1,                     // request after [minLength] characters
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
    this.tempVal    = "";     // when activating an item, store user input
    this.opened     = false;
    this.pointer    = -1;     // active item in list (-1 = no active item)
    this.arrayName  = this.options.arrayName || false;      // if needed, name of the data array in response object
    this.url        = this.element.getAttribute(urlAttr);
    this.request    = new XMLHttpRequest();
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

      // close on document click
      document.body.addEventListener('click', function(e) {
        e = e || window.event;

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

      that.results.addEventListener("click", function(e) {
          e = e || window.event;

          if (e.target && e.target.matches("a")) {
            that._insertSuggestion( e.target.innerText );
          }
        });
    },

    _prepareDOM: function() {
      // prepare results box
      var results = document.createElement('ul');
          results.setAttribute('role', 'listbox');

      var resultsWrapper = document.createElement('div');
          resultsWrapper.className = this.options.resultsClass;
          resultsWrapper.appendChild(results);

      this.element.appendChild(resultsWrapper);
      this.results = resultsWrapper;

      // prepare input
      this.input = this.element.querySelector('input');
      this.input.setAttribute('role', 'combobox');
      this.input.setAttribute('aria-autocomplete', 'list');

      return this;
    },

    _keyboardNavigation: function() {
      var that = this,
          timeout;

      // Prevent form submit when navigating in suggestions
      that.input.addEventListener('keydown', function(e) {
        e = e || window.event;

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
              }, 250);

            } else {
              that.data = [];
              that._closeSuggestions();
            }
            break;
        }
      });

      return this;
    },

    _closeSuggestions: function() {
      if (this.opened) {
        this.results.classList.remove(this.options.visibilityClass);
        this.pointer = -1;
        this.opened = false;
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

      callback = callback.bind(that);

      that.request.open("GET", that.url + string, true);
      that.request.onreadystatechange = function () {
        if (  this.readyState != 4 || this.status != 200) { return; }
        callback(string, JSON.parse(  this.responseText));
      };
      that.request.send();

      return that.request;
    },

    _displaySuggestions: function(string, data) {
      var that = this;

      that.tempVal = that.input.value;

      if (data) {
        // if it's directly an array of results -> [{"bla": "xxx"}, {"bla": "xxx"}, {"bla": "xxx"}]
        if (data.length) {
          that.data = data;

        // if the array is in an object (arrayName otpion is required)
        // -> {"items": [{"bla": "xxx"}, {"bla": "xxx"}, {"bla": "xxx"}]}
        } else {
          if (that.arrayName) {
            that.data = data[that.arrayName];
          } else {
            console.log('You must specify the arrayName option to find data', 'data-suggest=\"{"arrayName": "Search", "label": "Title"}\" for exemple');
          }
        }
      }

      if (string !== '' && typeof that.data !== 'undefined' && that.data.length > 0) {
        // directly return if only 1 entry  and if === user entry
        if (that.data.length === 1 && string === that.data[0][that.options.label]) { return; }

        // generate results list
        var template = '';

        for (var i = 0, len = that.data.length; i < len; i++) {
          template += '<li id="'+ i +'" role="option" class="'+ that.options.itemClass +'">';
          template += '  <a href="#" type="button" tabindex="-1">'+ that.data[i][that.options.label] +'</a>';
          template += '</li>';
        }

        that.results.querySelector('ul').innerHTML = template;
        that.results.classList.add(this.options.visibilityClass);

        // set status
        that.opened = true;
        that.pointer = -1;

        // keep suggestions list
        that.suggestions = that.results.querySelectorAll('li');

      } else {
        that._closeSuggestions();
      }
    },

    _preSuggestion: function() {
      // prefill the input with selected suggestion
      this.input.value = this.data[this.pointer][this.options.label];
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

    _insertSuggestion: function(string) {
      this.input.value = string ? string : this.data[this.pointer][this.options.label];
      this.data = [];
      this._closeSuggestions();
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
})();