import React from 'react';
import { Link } from "react-router-dom";

export default class Nav extends React.Component {
  constructor(props) {
    super(props)
  }

  
  render() {
    const scraperLogUrl = `https://storage.googleapis.com/show-scraper-data/scraper.log?_=${Date.now()}`;

    return (
        <div className='nav-container'>
        {/* <nav className='flex-row' > */}
            {/* <div className='flex-row' > */}
                <div className='nav-items'>
                    <div className='nav-item nav-item-no-click'>Bay Area Shows</div>

                    <Link to='/TextView'>
                        <div className={`nav-item ${this.props.route === "TextView" ? "selected" : ""}`}>Text View</div>
                    </Link>

                    <Link to='/TextAndImagesView'>
                        <div className={`nav-item ${(this.props.route === "TextAndImagesView") ? "selected" : ""}`}>Flyers View</div>
                    </Link>

                    <Link to='/ShowsByVenueView'>
                        <div className={`nav-item ${this.props.route === "ShowsByVenueView" ? "selected" : ""}`}>Shows by Venue</div>
                    </Link>

                    <Link to='/CalendarView'>
                        <div className={`nav-item ${this.props.route === "CalendarView" ? "selected" : ""}`}>Calendar View</div>
                    </Link>

                    <Link to='/MapView'>
                        <div className={`nav-item ${this.props.route === "MapView" ? "selected" : ""}`}>Map View</div>
                    </Link>

                    <Link to='/VenuesListView'>
                        <div className={`nav-item ${this.props.route === "VenuesListView" ? "selected" : ""}`}>Venues</div>
                    </Link>
                    
                    <Link to='/About'>
                        <div className={`nav-item ${this.props.route === "About" ? "selected" : ""}`}>About</div>
                    </Link>
                    
                    <a href={scraperLogUrl}>
                        <div className='nav-item'>Scraper Log</div>
                    </a>

                    <a href='mailto:maxpleaner@gmail.com?subject=bayareashows.org%20suggestion'>
                        <div className='nav-item'>Suggest Improvement</div>
                    </a>

                </div>

            {/* </div> */}
 
            {/* //   </nav> */}
        </div>
    )
  }
}
