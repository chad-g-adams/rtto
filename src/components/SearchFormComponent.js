'use strict';

import React from 'react';

import { Link } from 'react-router';
import LocationDisambiguation from './LocationDisambiguationComponent';
import Loading from './LoadingComponent';

import { translate } from 'react-i18next';

const POSTAL_CODE_REGEX = /^[A-Za-z]\d[A-Za-z]/;

class SearchFormComponent extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      locationDisambiguation: null,
      searchText: null,
      searchLocationText: null
    };
  }

  componentDidMount() {
    this.reset();
  }

  componentWillReceiveProps() {
    this.reset();
  }

  reset() {
    this.setState({
      locationDisambiguation: null,
      searchText: null,
      searchLocationText: null
    });
  }

  handleSubmit(e) {
    e.preventDefault();

    this.setState({
      searchText: this.refs.searchTextInput.value,
      searchLocationText: this.refs.searchLocationInput.value
    }, this.handleSearch);
  }

  handleSearch() {
    if (!this.state.searchLocationText) {
      this.props.onSearch(this.state.searchText);
      return;
    }

    this.performLocationSearch();
  }

  handleLocationSelection(location) {
    this.setState({
      searchLocationText: location.placeName
    });
    this.props.onSearch(
      this.state.searchText,
      location.placeName,
      [location.longitude, location.latitude]
    );
  }

  handleNoLocationFound() {
    this.props.onSearch(
      this.state.searchText,
      this.state.searchLocationText
    );
  }

  isPostalCode(text) {
    return POSTAL_CODE_REGEX.exec(text);
  }

  performLocationSearch() {
    let locationText = this.state.searchLocationText;
    let url  = this.context.config.geo_api_root +
            '/api/placeNameSearch?placeName=' + locationText;
    if (this.isPostalCode(locationText)) {
      // strip to first 3 characters because Geonames dataset only contains
      // first half of canadian postal codes
      let postalCode = locationText.slice(0, 3).toUpperCase();
      url  = this.context.config.geo_api_root +
              '/api/postalCodeLookup?postalCode=' + postalCode;
    }

    fetch(url)
    .then(response => {
      if (response.ok) {
        return response.json();
      }
      return Promise.reject(response.statusCode);
    })
    .then(results => {
      if (!Array.isArray(results)) {
        results = [results];
      }
      this.handleLocationQueryResponse(results);
    })
    .catch(err => {
      // TODO: Handle error
      // eslint-disable-next-line no-console
      console.log(err);
    });
  }

  handleLocationQueryResponse(results) {
    let locationTextString = this.state.searchLocationText;
    if (results.length == 0) {
      this.handleNoLocationFound();
      return;
    }

    if (results.length == 1) {
      this.handleLocationSelection(results[0]);
      return;
    }

    // If the form's value exactly matches a place name, let's use that place
    // even if there may be other matches.
    // But need to look at brackets too, because there is
    // "Kingston" (from New Brunswick) vs "Kingston (Downtown)" (from Ontario)
    // and that is a case we would want to disambiguate on.
    // But if they search "Kingston (Downtown)" don't disambiguate.
    let exactPlaceMatch = [];
    if (locationTextString.includes('(')) {
      exactPlaceMatch = results.filter(location => {
        return location.placeName.toLowerCase().trim() === locationTextString.toLowerCase().trim();
      });
    } else {
      exactPlaceMatch = results.filter(location => {
        return location.placeName.split('(')[0].toLowerCase().trim() === locationTextString.toLowerCase().trim();
      });
    }
    if (exactPlaceMatch.length === 1) {
      this.handleLocationSelection(exactPlaceMatch[0]);
      return;
    }

    // Otherwise, we need to enter location disambiguation phase
    this.setState({locationDisambiguation: results});
  }

  render() {
    const { t } = this.props;

    if (!this.context.config.geo_api_root) {
      return (<Loading />);
    }

    if (this.state.locationDisambiguation && this.state.locationDisambiguation.length > 1) {
      return (
        <LocationDisambiguation locations={this.state.locationDisambiguation}
              handleLocationSelection={this.handleLocationSelection.bind(this)}/>
      );
    }

    var searchText = '';

    if (this.props.searchText) {
      searchText = this.props.searchText;
    }

    let searchLocation = this.props.searchLocation || '';

    return (
      <form className="search-form searchform-component" onSubmit={this.handleSubmit.bind(this)}>

        <input className="search-form__query"
          placeholder="Find social enterprises" type="search"
          ref="searchTextInput" defaultValue={searchText} />

        <input className="search-location-field" name="at"
          placeholder={t('searchForm:townOrPostalCode')} type="search"
          ref="searchLocationInput" defaultValue={searchLocation} />

        <input className="btn btn-default btn-lg search-form__button"
          style={{marginRight: '10px'}} type="submit" value="Search" />

        <Link className="btn btn-default btn-lg search-form__button"
          to="/directory">Browse</Link>

      </form>
    );
  }
}

SearchFormComponent.displayName = 'SearchFormComponent';

SearchFormComponent.contextTypes = {
  'config': React.PropTypes.object,
  'logger': React.PropTypes.object
};

// Uncomment properties you need
// SearchFormComponent.propTypes = {};
// SearchFormComponent.defaultProps = {};

export { SearchFormComponent };
export default translate('searchForm')(SearchFormComponent);
