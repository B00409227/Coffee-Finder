import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { 
  Box, 
  Card, 
  TextField, 
  Button, 
  IconButton, 
  Typography,
  AppBar,
  Toolbar,
  Drawer,
  useTheme,
  useMediaQuery,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Alert,
  Snackbar,
  Dialog,
  DialogContent
} from '@mui/material';
import { 
  PhotoCamera, 
  ArrowBack, 
  Menu as MenuIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  NavigateNext as NavigateNextIcon,
  NavigateBefore as NavigateBeforeIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { Geolocation } from '@capacitor/geolocation';
import L from 'leaflet';

// Custom hook for map recenter
function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center);
    }
  }, [center, map]);
  return null;
}

// Add this coffee marker definition - just changing the color of the default marker
const coffeeIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  iconRetinaUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});


function MapPage() {
  const [userLocation, setUserLocation] = useState(null);
  const [selectedShop, setSelectedShop] = useState(null);
  const [note, setNote] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [coffeeShops, setCoffeeShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editedNoteText, setEditedNoteText] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState(null);
  const videoRef = useRef(null);
  const [photos, setPhotos] = useState([]);
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [editingPhotoId, setEditingPhotoId] = useState(null);
  const [slideshow, setSlideshow] = useState({
    open: false,
    currentIndex: 0
  });
  
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const navigate = useNavigate();

  // Get user location
  useEffect(() => {
    const getCurrentPosition = async () => {
      try {
        const coordinates = await Geolocation.getCurrentPosition();
        setUserLocation({
          lat: coordinates.coords.latitude,
          lng: coordinates.coords.longitude
        });
        fetchCoffeeShops(coordinates.coords.latitude, coordinates.coords.longitude);
      } catch (error) {
        setError('Error getting location. Please enable location services.');
        setLoading(false);
      }
    };
    getCurrentPosition();
  }, []);

  // Fetch coffee shops using Overpass API
  const fetchCoffeeShops = async (lat, lng) => {
    try {
      const radius = 3218.69; // 2 miles in meters
      const query = `
        [out:json][timeout:25];
        (
          node["amenity"="cafe"](around:${radius},${lat},${lng});
        );
        out body;
      `;
      
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `data=${encodeURIComponent(query)}`
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      console.log(data); // Log the response data
      
      const shops = data.elements.map(element => ({
        id: element.id,
        name: element.tags.name || 'Unnamed Coffee Shop',
        lat: element.lat,
        lng: element.lon,
        address: element.tags['addr:street'] || 'Address not available',
        phone: element.tags['contact:phone'] || 'Phone number not available',
        website: element.tags['website'] || 'Website not available',
        opening_hours: element.tags['opening_hours'] || 'Opening hours not available',
        notes: JSON.parse(localStorage.getItem(`shop_${element.id}_notes`) || '[]'),
        photos: JSON.parse(localStorage.getItem(`shop_${element.id}_photos`) || '[]')
      }));

      setCoffeeShops(shops);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching coffee shops:', error);
      setError('Error fetching coffee shops');
      setLoading(false);
    }
  };

  // Replace the existing takePicture function with these new camera functions
  const startCamera = async () => {
    try {
      const videoStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment'
        } 
      });
      setStream(videoStream);
      setShowCamera(true);
    } catch (error) {
      console.error('Error accessing camera:', error);
      setSnackbar({
        open: true,
        message: 'Error accessing camera',
        severity: 'error'
      });
    }
  };

  const updatePhoto = async (photoId) => {
    try {
      const videoStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setStream(videoStream);
      setShowCamera(true);
      setEditingPhotoId(photoId);
    } catch (error) {
      console.error('Error accessing camera:', error);
      setSnackbar({
        open: true,
        message: 'Error accessing camera',
        severity: 'error'
      });
    }
  };

  const takePicture = () => {
    if (!videoRef.current || !stream) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
    
    const imageUrl = canvas.toDataURL('image/jpeg');

    // Stop camera and hide interface
    stream.getTracks().forEach(track => track.stop());
    setStream(null);
    setShowCamera(false);

    if (selectedShop) {
      let updatedPhotos;
      
      if (editingPhotoId) {
        updatedPhotos = photos.map(photo => 
          photo.id === editingPhotoId 
            ? { 
                ...photo, 
                url: imageUrl, 
                edited: new Date().toISOString() 
              }
            : photo
        );
        setEditingPhotoId(null);
      } else {
        const newPhoto = {
          id: Date.now(),
          url: imageUrl,
          date: new Date().toISOString()
        };
        updatedPhotos = [...photos, newPhoto];
      }
      
      setPhotos(updatedPhotos);
      localStorage.setItem(`shop_${selectedShop.id}_photos`, JSON.stringify(updatedPhotos));

      setSnackbar({
        open: true,
        message: editingPhotoId ? 'Photo updated successfully!' : 'Photo taken successfully!',
        severity: 'success'
      });
    }
  };

  // Add this cleanup effect near other useEffects
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // Add this useEffect near your other useEffects
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Add this effect to load data when selectedShop changes
  useEffect(() => {
    if (selectedShop) {
      const shopPhotos = JSON.parse(localStorage.getItem(`shop_${selectedShop.id}_photos`) || '[]');
      const shopNotes = JSON.parse(localStorage.getItem(`shop_${selectedShop.id}_notes`) || '[]');
      setPhotos(shopPhotos);
      setNotes(shopNotes);
    }
  }, [selectedShop]);

  // Delete photo
  const deletePhoto = (photoId) => {
    const updatedPhotos = photos.filter(photo => photo.id !== photoId);
    setPhotos(updatedPhotos);
    localStorage.setItem(`shop_${selectedShop.id}_photos`, JSON.stringify(updatedPhotos));
    
    setSnackbar({
      open: true,
      message: 'Photo deleted successfully!',
      severity: 'success'
    });
  };

  // Save note
  const saveNote = () => {
    if (selectedShop && note.trim()) {
      const notes = JSON.parse(localStorage.getItem(`shop_${selectedShop.id}_notes`) || '[]');
      notes.push({
        id: Date.now(), // Unique ID for each note
        text: note,
        date: new Date().toISOString()
      });
      localStorage.setItem(`shop_${selectedShop.id}_notes`, JSON.stringify(notes));

      // Update coffee shops state
      setCoffeeShops(prevShops => 
        prevShops.map(shop => 
          shop.id === selectedShop.id 
            ? { ...shop, notes: notes }
            : shop
        )
      );

      setNote('');
      setSnackbar({
        open: true,
        message: 'Note saved successfully!',
        severity: 'success'
      });
    }
  };

  // Delete note
  const deleteNote = (noteId) => {
    const updatedNotes = notes.filter(note => note.id !== noteId);
    setNotes(updatedNotes);
    localStorage.setItem(`shop_${selectedShop.id}_notes`, JSON.stringify(updatedNotes));
    
    setSnackbar({
      open: true,
      message: 'Note deleted successfully!',
      severity: 'success'
    });
  };

  // Edit note
  const startEditingNote = (note) => {
    setEditingNoteId(note.id);
    setEditedNoteText(note.text);
  };

  const saveEditedNote = () => {
    if (editedNoteText.trim()) {
      const updatedNotes = notes.map(note => 
        note.id === editingNoteId 
          ? { ...note, text: editedNoteText, editedAt: new Date().toISOString() }
          : note
      );
      setNotes(updatedNotes);
      localStorage.setItem(`shop_${selectedShop.id}_notes`, JSON.stringify(updatedNotes));

      // Update coffee shops state
      setCoffeeShops(prevShops => 
        prevShops.map(shop => 
          shop.id === selectedShop.id 
            ? { ...shop, notes: updatedNotes }
            : shop
        )
      );

      setEditingNoteId(null);
      setEditedNoteText('');
      setSnackbar({
        open: true,
        message: 'Note updated successfully!',
        severity: 'success'
      });
    }
  };

  // Note functions
  const addNote = (text) => {
    const newNote = {
      id: Date.now(),
      text,
      date: new Date().toISOString()
    };
    
    const updatedNotes = [...notes, newNote];
    setNotes(updatedNotes);
    localStorage.setItem(`shop_${selectedShop.id}_notes`, JSON.stringify(updatedNotes));
    
    setSnackbar({
      open: true,
      message: 'Note added successfully!',
      severity: 'success'
    });
  };

  const updateNote = (noteId, newText) => {
    const updatedNotes = notes.map(note => 
      note.id === noteId 
        ? { ...note, text: newText, edited: new Date().toISOString() }
        : note
    );
    
    setNotes(updatedNotes);
    localStorage.setItem(`shop_${selectedShop.id}_notes`, JSON.stringify(updatedNotes));
    
    setSnackbar({
      open: true,
      message: 'Note updated successfully!',
      severity: 'success'
    });
  };

  // Slideshow functions
  const openSlideshow = (index) => {
    setSlideshow({
      open: true,
      currentIndex: index
    });
  };

  const closeSlideshow = () => {
    setSlideshow({
      open: false,
      currentIndex: 0
    });
  };

  const nextPhoto = () => {
    setSlideshow(prev => ({
      ...prev,
      currentIndex: (prev.currentIndex + 1) % photos.length
    }));
  };

  const previousPhoto = () => {
    setSlideshow(prev => ({
      ...prev,
      currentIndex: (prev.currentIndex - 1 + photos.length) % photos.length
    }));
  };

  return (
    <Box sx={{ height: '100vh', width: '100vw', position: 'relative' }}>
      {/* Add this camera interface before the AppBar */}
      {showCamera && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'black',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <Box
            sx={{
              position: 'absolute',
              bottom: 20,
              left: 0,
              right: 0,
              display: 'flex',
              justifyContent: 'center',
              gap: 2
            }}
          >
            <IconButton 
              onClick={() => {
                stream.getTracks().forEach(track => track.stop());
                setStream(null);
                setShowCamera(false);
              }}
              sx={{ color: 'white' }}
            >
              <CloseIcon />
            </IconButton>
            <IconButton 
              onClick={takePicture}
              sx={{ 
                color: 'white',
                border: '2px solid white',
                p: 2
              }}
            >
              <PhotoCamera />
            </IconButton>
          </Box>
        </Box>
      )}

      {/* App Bar */}
      <AppBar position="fixed" color="primary" sx={{ zIndex: theme.zIndex.drawer + 1 }}>
        <Toolbar>
          {!isDesktop && (
            <IconButton 
              edge="start" 
              color="inherit" 
              onClick={() => setDrawerOpen(!drawerOpen)}
            >
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Coffee Finder
          </Typography>
          <IconButton color="inherit" onClick={() => navigate('/')}>
            <ArrowBack />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Sidebar */}
      <Drawer
        variant={isDesktop ? "permanent" : "temporary"}
        open={isDesktop || drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{
          width: isDesktop ? 340 : 250,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: isDesktop ? 340 : 250,
            boxSizing: 'border-box',
            top: ['64px']
          },
        }}
      >
        <List sx={{ mt: 8 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>
          ) : coffeeShops.length === 0 ? (
            <Typography sx={{ p: 2 }}>No coffee shops found nearby</Typography>
          ) : (
            coffeeShops.map((shop) => (
              <ListItem 
                key={shop.id} 
                button 
                selected={selectedShop?.id === shop.id}
                onClick={() => {
                  setSelectedShop(shop);
                  setDrawerOpen(false);
                }}
              >
                <ListItemText 
                  primary={shop.name} 
                  secondary={`Notes: ${shop.notes.length} | Photos: ${shop.photos.length}`}
                />
              </ListItem>
            ))
          )}
        </List>
      </Drawer>

      {/* Map Container */}
      <Box sx={{ 
        height: '100vh', 
        marginLeft: isDesktop ? '340px' : 0,
        marginTop: '64px'
      }}>
        {userLocation ? (
          <MapContainer
            center={[userLocation.lat, userLocation.lng]}
            zoom={15}
            style={{ height: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            <MapUpdater center={[userLocation.lat, userLocation.lng]} />
            
            {/* User Location Marker */}
            <Marker position={[userLocation.lat, userLocation.lng]}>
              <Popup>You are here</Popup>
            </Marker>

            {/* Coffee Shop Markers */}
            {coffeeShops.map((shop) => (
              <Marker
                key={shop.id}
                position={[shop.lat, shop.lng]}
                icon={coffeeIcon}
              >
                <Popup>
                  <Box sx={{ minWidth: 200 }}>
                    <Typography variant="subtitle1">{shop.name}</Typography>
                    <Typography variant="body2">{shop.address}</Typography>
                    <Typography variant="body2">Phone: {shop.phone}</Typography>
                    <Typography variant="body2">Website: <a href={shop.website} target="_blank" rel="noopener noreferrer">{shop.website}</a></Typography>
                    <Typography variant="body2">Opening Hours: {shop.opening_hours}</Typography>
                    <Button 
                      variant="contained" 
                      size="small" 
                      fullWidth 
                      sx={{ mt: 1 }}
                      onClick={() => setSelectedShop(shop)}
                    >
                      View Details
                    </Button>
                  </Box>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        ) : (
          <Box sx={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <CircularProgress />
          </Box>
        )}
      </Box>

      {/* Add this bottom panel for selected shop */}
      {selectedShop && (
        <Card
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            p: 2,
            m: { xs: 0, md: 2 },
            borderRadius: { xs: '16px 16px 0 0', md: 2 },
            maxWidth: { xs: '100%', md: '400px' },
            ml: { xs: 0, md: 'auto' },
            maxHeight: '50vh',
            overflow: 'auto',
            zIndex: 1000,
            bgcolor: 'background.paper'
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6">{selectedShop.name}</Typography>
            <IconButton 
              size="small" 
              onClick={() => setSelectedShop(null)}
            >
              <CloseIcon />
            </IconButton>
          </Box>

          {/* Photos Section */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6">Photos</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {photos.map((photo, index) => (
                <Box 
                  key={photo.id} 
                  sx={{ 
                    position: 'relative',
                    cursor: 'pointer'
                  }}
                  onClick={() => openSlideshow(index)}
                >
                  <img 
                    src={photo.url} 
                    alt="Coffee shop" 
                    style={{ width: 100, height: 100, objectFit: 'cover' }}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      right: 0,
                      display: 'flex',
                      gap: 0.5,
                      bgcolor: 'rgba(255, 255, 255, 0.8)',
                      borderRadius: '0 0 0 8px',
                      p: 0.5
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <IconButton
                      size="small"
                      onClick={() => updatePhoto(photo.id)}
                      sx={{ p: 0.5 }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => deletePhoto(photo.id)}
                      sx={{ p: 0.5 }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  {photo.edited && (
                    <Typography
                      variant="caption"
                      sx={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        bgcolor: 'rgba(0, 0, 0, 0.6)',
                        color: 'white',
                        p: 0.5,
                        fontSize: '0.7rem',
                        textAlign: 'center'
                      }}
                    >
                      Edited
                    </Typography>
                  )}
                </Box>
              ))}
            </Box>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<PhotoCamera />}
              onClick={startCamera}
              sx={{ mt: 1 }}
            >
              Take Photo
            </Button>
          </Box>

          {/* Add Slideshow Modal */}
          <Dialog
            open={slideshow.open}
            onClose={closeSlideshow}
            maxWidth="lg"
            fullWidth
          >
            <DialogContent 
              sx={{ 
                p: 0, 
                position: 'relative',
                bgcolor: 'black',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '60vh'
              }}
            >
              {photos.length > 0 && (
                <img
                  src={photos[slideshow.currentIndex].url}
                  alt="Coffee shop"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '80vh',
                    objectFit: 'contain'
                  }}
                />
              )}
              <IconButton
                onClick={closeSlideshow}
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  color: 'white',
                  bgcolor: 'rgba(0, 0, 0, 0.5)',
                  '&:hover': {
                    bgcolor: 'rgba(0, 0, 0, 0.7)'
                  }
                }}
              >
                <CloseIcon />
              </IconButton>
              {photos.length > 1 && (
                <>
                  <IconButton
                    onClick={previousPhoto}
                    sx={{
                      position: 'absolute',
                      left: 8,
                      color: 'white',
                      bgcolor: 'rgba(0, 0, 0, 0.5)',
                      '&:hover': {
                        bgcolor: 'rgba(0, 0, 0, 0.7)'
                      }
                    }}
                  >
                    <NavigateBeforeIcon />
                  </IconButton>
                  <IconButton
                    onClick={nextPhoto}
                    sx={{
                      position: 'absolute',
                      right: 8,
                      color: 'white',
                      bgcolor: 'rgba(0, 0, 0, 0.5)',
                      '&:hover': {
                        bgcolor: 'rgba(0, 0, 0, 0.7)'
                      }
                    }}
                  >
                    <NavigateNextIcon />
                  </IconButton>
                </>
              )}
            </DialogContent>
          </Dialog>

          {/* Notes Section */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6">Notes</Typography>
            <TextField
              fullWidth
              multiline
              rows={2}
              placeholder="Add a note..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              sx={{ mb: 1 }}
            />
            <Button
              fullWidth
              variant="contained"
              onClick={() => {
                if (newNote.trim()) {
                  addNote(newNote.trim());
                  setNewNote('');
                }
              }}
            >
              Add Note
            </Button>
            <Box sx={{ mt: 2 }}>
              {notes.map((note) => (
                <Card key={note.id} sx={{ mb: 1, p: 1 }}>
                  {editingNoteId === note.id ? (
                    <TextField
                      fullWidth
                      multiline
                      value={editedNoteText}
                      onChange={(e) => setEditedNoteText(e.target.value)}
                      sx={{ mb: 1 }}
                    />
                  ) : (
                    <Typography>{note.text}</Typography>
                  )}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(note.date).toLocaleString()}
                    </Typography>
                    <Box>
                      {editingNoteId === note.id ? (
                        <>
                          <Button 
                            size="small" 
                            onClick={() => {
                              updateNote(note.id, editedNoteText);
                              setEditingNoteId(null);
                            }}
                          >
                            Save
                          </Button>
                          <Button 
                            size="small" 
                            onClick={() => setEditingNoteId(null)}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <IconButton 
                            size="small" 
                            onClick={() => {
                              setEditingNoteId(note.id);
                              setEditedNoteText(note.text);
                            }}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            onClick={() => deleteNote(note.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </>
                      )}
                    </Box>
                  </Box>
                </Card>
              ))}
            </Box>
          </Box>
        </Card>
      )}

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default MapPage; 