import React from 'react';
import ReactDOM from 'react-dom/client';
import {App} from './App';

import { HashRouter, Routes, Route } from "react-router-dom";
import { RecoilRoot } from 'recoil';

const root = ReactDOM.createRoot(document.getElementById('root'));

const ROOT_VIEW = "MapView"
// const ROOT_VIEW = "TextView"
// const ROOT_VIEW = "TextAndImagesView"

root.render(
  <React.StrictMode>
    <RecoilRoot>
      <HashRouter basename="/">
        <Routes>
          <Route exact path="/" element={<App route={ROOT_VIEW} />} />
          <Route path="/TextAndImagesView" element={<App route='TextAndImagesView' />} />
          <Route path="/TextView" element={<App route='TextView' />} />
          <Route path="/ShowsByVenueView" element={<App route='ShowsByVenueView' />} />
          <Route path="/CalendarView" element={<App route='CalendarView' />} />
          <Route path="/MapView" element={<App route='MapView' />} />
          <Route path="/VenuesListView" element={<App route='VenuesListView' />} />
          <Route path="/About" element={<App route='About' />} />
        </Routes>
      </HashRouter>
    </RecoilRoot>
  </React.StrictMode>
);
