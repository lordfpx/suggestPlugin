# suggestPlugin
  This JS native accessible plugin will propose suggestions from ajax response.

## Plugin initialization

  Default options are:

  ```javascript
  {
    abel          : 'label',                // match input with that
    minLength      : 1,                     // request after [minLength] characters
    activeClass    : 'active',              // class for active items (hover+active)
    resultsClass   : 'suggest-list',        // class to the results list element
    itemsClass     : 'suggest-list__items', // class on each items
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

  ```html
  <div data-suggest='{"arrayName": "Search", "label": "Title"}' data-suggest-url="//www.omdbapi.com/?s=">
    <label for="searchFilm">search film title</label>
    <input id="searchFilm" type="text" name="searchFilm">
  </div>
  ```

  Example for [restcountries API](https://restcountries.eu/):

  ```html
  <div data-suggest='{"label": "name"}' data-suggest-url="//restcountries.eu/rest/v1/name/">
    <label for="searchCountry">search country name</label>
    <input id="searchCountry" type="text" name="searchCountry"/>
  </div>
  ```

  Example for [stackexchange API](https://api.stackexchange.com/) (stackOverflow here):

  ```html
  <div data-suggest='{"arrayName": "items", "label": "title"}' data-suggest-url="//api.stackexchange.com/2.0/search?site=stackoverflow.com&amp;tagged=javascript&amp;pagesize=10&amp;intitle=">
    <label for="searchStackoverflow">search question on stackoverflow</label>
    <input id="searchStackoverflow" type="text" name="searchStackoverflow"/>
  </div>
  ```