# suggestPlugin

  This JS native accessible plugin will propose suggestions from ajax response.

  The display and animations are to be managed in CSS side using defaults or configured classes. You can also use JS custom events provided by the plugin to listen and make custom actions.

  It provide also a minimal template system to display more informations in the list, see below.

  Demo: [Codepen](https://codepen.io/lordfpx/pen/zqRzjX)

  You can also find it on npm: https://www.npmjs.com/package/suggest-plugin

  > npm install suggest-plugin

  The plugin is commonJS (tested with browserify) and AMD (untested) compliant.


## Plugin initialization

  Default options are:

  ```javascript
  {
    matchWith      : 'label',               // match user input with this name ('matchWith' is the new name for 'label')
    minLength      : 1,                     // request after [minLength] characters
    wrapperClass   : 'suggest-wrapper',     // class for the div that wrap both input and results
    activeClass    : 'active',              // class for active items (hover+active)
    resultsClass   : 'suggest-list',        // class to the results list element
    itemClass      : 'suggest-list__item',  // class on each items
    visibilityClass: 'is-opened'            // class to define results list visibility
  };
  ```


  Simple use with defaults options:

  ```javascript
  suggestPlugin();
  ```


  Custom example:

  ```javascript
  suggestPlugin({
    minLength: 3,
    activeClass: 'is-focused'
  });
  ```


## HTML markup

  Example for [OMDb API](http://omdbapi.com/):

  Note the data-suggest-template attribute usage. By default, items will be the defined 'label'. If needed, you can also display other informations coming from the API such as the 'Type' in that case with custom template for the desired display.

  ```html
  <div data-suggest='{"arrayName": "Search", "matchWith": "Title"}' data-suggest-template='<span class="type">+<% Type %>+</span> - +<% Title %>' data-suggest-url="//www.omdbapi.com/?s=">
    <label for="searchFilm">search film title</label>
    <input id="searchFilm" type="text" name="searchFilm">
  </div>
  ```


  Example for [restcountries API](https://restcountries.eu/):

  ```html
  <div data-suggest='{"matchWith": "name"}' data-suggest-url="//restcountries.eu/rest/v1/name/">
    <label for="searchCountry">search country name</label>
    <input id="searchCountry" type="text" name="searchCountry"/>
  </div>
  ```


  Example for [stackexchange API](https://api.stackexchange.com/) (stackOverflow here):

  ```html
  <div data-suggest='{"arrayName": "items", "matchWith": "title"}' data-suggest-url="//api.stackexchange.com/2.0/search?site=stackoverflow.com&amp;tagged=javascript&amp;pagesize=10&amp;intitle=">
    <label for="searchStackoverflow">search question on stackoverflow</label>
    <input id="searchStackoverflow" type="text" name="searchStackoverflow"/>
  </div>
  ```

## Custom events

The plugin send some custom events that can be listened:

- suggestRequest: before the ajax call
- suggestOpen: before results list opening
- suggestClose: before results list closing
- suggestSelected: after the user has made a choice

Example usage:

  ```javascript
  var suggestPluginElements = document.querySelectorAll('[data-suggest]');

  for (var i = 0, len = suggestPluginElements.length; i < len; i++){
    suggestPluginElements[i].addEventListener('suggestRequest', function(e){
      console.log(e);
    });
  }
  ```
