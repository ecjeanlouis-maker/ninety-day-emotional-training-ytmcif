/* eslint-disable @typescript-eslint/ban-ts-comment */
import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
// @ts-ignore — react-leaflet types are conditionally available
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
// @ts-ignore — leaflet CSS is web-only
import 'leaflet/dist/leaflet.css';
// @ts-ignore — leaflet default export typing varies by environment
import L from 'leaflet';

// Fix for default marker icon in leaflet
// eslint-disable-next-line @typescript-eslint/no-require-imports
const iconRetinaUrl = require('leaflet/dist/images/marker-icon-2x.png');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const iconUrl = require('leaflet/dist/images/marker-icon.png');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const shadowUrl = require('leaflet/dist/images/marker-shadow.png');

// Only run on client side (safe check)
if (typeof window !== 'undefined') {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
        iconRetinaUrl: iconRetinaUrl,
        iconUrl: iconUrl,
        shadowUrl: shadowUrl,
    });
}

export interface MapMarker {
    id: string;
    latitude: number;
    longitude: number;
    title?: string;
    description?: string;
}

interface MapProps {
    markers?: MapMarker[];
    initialRegion?: {
        latitude: number;
        longitude: number;
        latitudeDelta: number;
        longitudeDelta: number;
    };
    style?: ViewStyle;
    showsUserLocation?: boolean;
}

export const Map = ({
    markers = [],
    initialRegion = {
        latitude: 37.78825,
        longitude: -122.4324,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
    },
    style,
    showsUserLocation = false
}: MapProps) => {

    const zoom = 13;
    const center: [number, number] = [initialRegion.latitude, initialRegion.longitude];

    // Cast to any to avoid prop type mismatches from conditionally-available leaflet types
    const AnyMapContainer = MapContainer as any;
    const AnyTileLayer = TileLayer as any;

    const mapElement = (
        <AnyMapContainer
            center={center}
            zoom={zoom}
            scrollWheelZoom={false}
            style={{ height: '100%', width: '100%' }}
        >
            <AnyTileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {markers.map((marker) => (
                <Marker
                    key={marker.id}
                    position={[marker.latitude, marker.longitude]}
                >
                    <Popup>
                        {marker.title}
                        {' '}
                        <br />
                        {' '}
                        {marker.description}
                    </Popup>
                </Marker>
            ))}
        </AnyMapContainer>
    );

    return (
        <View style={[styles.container, style]}>
            {/* MapContainer needs a fixed height/width context */}
            <div style={{ height: '100%', width: '100%', minHeight: 200 }}>
                {typeof window !== 'undefined' && mapElement}
            </div>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        overflow: 'hidden',
        borderRadius: 12,
        width: '100%',
        minHeight: 200,
    },
});
