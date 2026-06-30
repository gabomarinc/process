import React from "react";
import "./DestinationCard.css";
import { ArrowRight } from "lucide-react";

export const DestinationCard = ({ imageUrl, location, flag, stats, themeColor, onClick }) => {
  return (
    <div
      style={{
        "--theme-color": themeColor,
      }}
      className="destination-card-group"
      onClick={onClick}
    >
      <div
        className="destination-card-anchor"
        style={{
          boxShadow: `0 0 40px -15px hsl(${themeColor} / 0.5)`
        }}
      >
        {/* Background Image */}
        <div
          className="destination-card-bg"
          style={{ backgroundImage: `url(${imageUrl})` }}
        />

        {/* Gradient Overlay */}
        <div
          className="destination-card-overlay"
          style={{
            background: `linear-gradient(to top, hsl(${themeColor} / 0.9), hsl(${themeColor} / 0.6) 30%, transparent 60%)`,
          }}
        />
        
        {/* Content */}
        <div className="destination-card-content">
          <h3 className="destination-card-title">
            {location} <span className="destination-card-flag">{flag}</span>
          </h3>
          <p className="destination-card-stats">{stats}</p>

          {/* Explore Button */}
          <div className="destination-card-btn">
            <span className="destination-card-btn-text">Ver Ejecuciones</span>
            <ArrowRight className="destination-card-btn-icon" />
          </div>
        </div>
      </div>
    </div>
  );
};
