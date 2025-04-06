import React from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Container, 
  Grid, 
  Card, 
  CardContent,
  useTheme,
  useMediaQuery,
  CircularProgress,
  Divider
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import LocalCafeIcon from '@mui/icons-material/LocalCafe';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CreateIcon from '@mui/icons-material/Create';
import { motion } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import UpdateIcon from '@mui/icons-material/Update';
import InstallMobileIcon from '@mui/icons-material/InstallMobile';

function LandingPage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const [nearbyShops, setNearbyShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);

  const calculateDistance = useCallback((lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return (R * c).toFixed(1);
  }, []);

  const fetchNearbyCoffeeShops = useCallback(async (lat, lon) => {
    try {
      const query = `
        [out:json][timeout:25];
        (
          node["amenity"="cafe"](around:3000,${lat},${lon});
        );
        out body;
        >;
        out skel qt;
      `;
      
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: query
      });
      
      const data = await response.json();
      const shops = data.elements
        .slice(0, 5)
        .map(shop => ({
          id: shop.id,
          name: shop.tags.name || 'Unnamed Cafe',
          distance: calculateDistance(lat, lon, shop.lat, shop.lon),
          coordinates: {
            lat: shop.lat,
            lon: shop.lon
          },
          tags: {
            ...shop.tags,
            cuisine: shop.tags.cuisine || 'coffee_shop',
            opening_hours: shop.tags.opening_hours || 'Hours not available'
          }
        }));
      
      shops.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
      setNearbyShops(shops);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching coffee shops:', error);
      setLoading(false);
    }
  }, [calculateDistance]);

  const handleShopSelect = (shop) => {
    navigate('/map', {
      state: {
        selectedShop: shop,
        center: [shop.coordinates.lat, shop.coordinates.lon],
        zoom: 16
      }
    });
  };

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lon: position.coords.longitude
          };
          setUserLocation(location);
          fetchNearbyCoffeeShops(location.lat, location.lon);
        },
        (error) => {
          console.error('Error getting location:', error);
          setLoading(false);
        }
      );
    }
  }, [fetchNearbyCoffeeShops]);

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
      <Container maxWidth="lg">
        {/* Hero Section */}
        <Grid container spacing={4} sx={{ py: { xs: 4, md: 8 } }}>
          <Grid item xs={12} md={6} sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center' 
          }}>
            <Box sx={{ textAlign: { xs: 'center', md: 'left' } }}>
              <LocalCafeIcon sx={{ 
                fontSize: { xs: 60, md: 80 }, 
                color: 'primary.main', 
                mb: 2 
              }} />
              <Typography 
                variant={isDesktop ? 'h2' : 'h3'} 
                component="h1" 
                gutterBottom 
                color="primary.main"
              >
                Coffee Finder
              </Typography>
              <Typography variant="h6" sx={{ mb: 4, color: 'text.secondary' }}>
                Discover local coffee shops, save your favorite spots, and share your coffee journey.
              </Typography>
              <Button 
                variant="contained" 
                size="large"
                onClick={() => navigate('/map')}
                sx={{ 
                  px: 4, 
                  py: 1.5,
                  fontSize: '1.2rem'
                }}
              >
                Find Coffee
              </Button>
            </Box>
          </Grid>

          {/* Feature Cards - Only visible on desktop */}
          <Grid item xs={12} md={6}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Card elevation={3}>
                  <CardContent>
                    <LocationOnIcon color="primary" />
                    <Typography variant="h6">Find Nearby</Typography>
                    <Typography variant="body2">
                      Discover coffee shops within 2 miles of your location
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Card elevation={3}>
                  <CardContent>
                    <CameraAltIcon color="primary" />
                    <Typography variant="h6">Take Photos</Typography>
                    <Typography variant="body2">
                      Capture and save memories of your coffee experiences
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Card elevation={3}>
                  <CardContent>
                    <CreateIcon color="primary" />
                    <Typography variant="h6">Add Notes</Typography>
                    <Typography variant="body2">
                      Keep track of your favorite drinks and experiences
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Container>

      {/* PWA Features Section */}
      <Box 
        sx={{ 
          bgcolor: 'primary.main', 
          py: { xs: 4, md: 8 },
          px: { xs: 2, md: 0 },
          mt: { xs: 3, md: 6 },
          color: 'white',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <Container maxWidth="lg">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Typography 
              variant="h2" 
              align="center" 
              gutterBottom 
              sx={{ 
                fontSize: { xs: '1.75rem', sm: '2.5rem', md: '3rem' },
                fontWeight: 700,
                mb: { xs: 3, md: 4 },
                lineHeight: 1.2
              }}
            >
              Works Offline, Always Available
            </Typography>

            <Grid 
              container 
              spacing={{ xs: 2, sm: 3, md: 4 }} 
              sx={{ 
                mt: { xs: 1, md: 2 },
                justifyContent: 'center',
                alignItems: 'stretch'
              }}
            >
              {[
                {
                  icon: <WifiOffIcon sx={{ fontSize: { xs: 32, sm: 40, md: 48 } }} />,
                  title: 'Offline First',
                  description: 'Access your saved coffee shops and notes even without internet connection'
                },
                {
                  icon: <UpdateIcon sx={{ fontSize: { xs: 32, sm: 40, md: 48 } }} />,
                  title: 'Auto Updates',
                  description: 'Always get the latest features and improvements automatically'
                },
                {
                  icon: <InstallMobileIcon sx={{ fontSize: { xs: 32, sm: 40, md: 48 } }} />,
                  title: 'Install on Device',
                  description: 'Add to your home screen for quick access on any device'
                }
              ].map((feature, index) => (
                <Grid item xs={12} sm={6} md={4} key={index}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.2 }}
                  >
                    <Box 
                      sx={{ 
                        textAlign: 'center',
                        height: '100%',
                        p: { xs: 2.5, sm: 3, md: 4 },
                        borderRadius: 2,
                        bgcolor: 'rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(10px)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'transform 0.3s ease-in-out',
                        '&:hover': {
                          transform: 'translateY(-8px)',
                          bgcolor: 'rgba(255, 255, 255, 0.15)'
                        }
                      }}
                    >
                      <Box sx={{ mb: { xs: 1.5, md: 2 } }}>
                        {feature.icon}
                      </Box>
                      <Typography 
                        variant="h6" 
                        sx={{ 
                          mb: { xs: 1, md: 1.5 },
                          fontWeight: 600,
                          fontSize: { xs: '1.25rem', sm: '1.4rem', md: '1.5rem' }
                        }}
                      >
                        {feature.title}
                      </Typography>
                      <Typography 
                        sx={{ 
                          opacity: 0.9,
                          fontSize: { xs: '0.9rem', sm: '1rem', md: '1.1rem' },
                          lineHeight: 1.5,
                          maxWidth: '280px',
                          margin: '0 auto'
                        }}
                      >
                        {feature.description}
                      </Typography>
                    </Box>
                  </motion.div>
                </Grid>
              ))}
            </Grid>
          </motion.div>
        </Container>
      </Box>

      {/* Nearby Coffee Shops Section */}
      <Box sx={{ 
        bgcolor: 'background.paper',
        py: { xs: 4, sm: 6, md: 8 },
        px: { xs: 2, md: 0 }
      }}>
        <Container maxWidth="lg">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Typography 
              variant="h2" 
              align="center" 
              gutterBottom
              sx={{
                fontSize: { xs: '1.75rem', sm: '2.5rem', md: '3rem' },
                fontWeight: 700,
                mb: { xs: 1, md: 2 },
                lineHeight: 1.2
              }}
            >
              Coffee Shops Near You
            </Typography>
            <Typography 
              variant="h6" 
              align="center" 
              color="text.secondary" 
              sx={{ 
                mb: { xs: 3, md: 4 },
                maxWidth: '600px',
                mx: 'auto',
                fontSize: { xs: '0.9rem', sm: '1rem', md: '1.1rem' },
                lineHeight: 1.5,
                px: { xs: 2, md: 0 }
              }}
            >
              Discover these hand-picked recommendations in your area
            </Typography>

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Grid 
                container 
                spacing={{ xs: 2, sm: 3, md: 4 }} 
                sx={{ 
                  mt: { xs: 1, md: 2 },
                  justifyContent: 'center'
                }}
              >
                {nearbyShops.map((shop, index) => (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.2 }}
                    >
                      <Card sx={{ 
                        height: '100%',
                        borderRadius: 2,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        transition: 'all 0.3s ease-in-out',
                        '&:hover': {
                          transform: 'translateY(-8px)',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
                        }
                      }}>
                        <CardContent sx={{ 
                          p: { xs: 2.5, md: 3 },
                          display: 'flex',
                          flexDirection: 'column',
                          height: '100%'
                        }}>
                          <Typography 
                            variant="h5" 
                            gutterBottom 
                            sx={{ 
                              fontWeight: 600,
                              fontSize: { xs: '1.25rem', md: '1.5rem' }
                            }}
                          >
                            {shop.name}
                          </Typography>
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            mb: 2,
                            color: 'text.secondary'
                          }}>
                            <LocationOnIcon sx={{ fontSize: '1.1rem', mr: 1 }} />
                            <Typography variant="body2">
                              {shop.distance}km away
                            </Typography>
                          </Box>
                          <Divider sx={{ my: 1.5 }} />
                          <Box sx={{ flex: 1 }}>
                            <Typography 
                              variant="body2" 
                              color="text.secondary"
                              sx={{ 
                                mb: 1,
                                display: 'flex',
                                alignItems: 'flex-start'
                              }}
                            >
                              <strong style={{ minWidth: '85px' }}>Specialties:</strong>
                              <span>{shop.tags.cuisine}</span>
                            </Typography>
                            <Typography 
                              variant="body2" 
                              color="text.secondary"
                              sx={{ 
                                display: 'flex',
                                alignItems: 'flex-start'
                              }}
                            >
                              <strong style={{ minWidth: '85px' }}>Hours:</strong>
                              <span>{shop.tags.opening_hours}</span>
                            </Typography>
                          </Box>
                         
                        </CardContent>
                      </Card>
                    </motion.div>
                  </Grid>
                ))}
              </Grid>
            )}
          </motion.div>
        </Container>
      </Box>

      {/* Call to Action Section */}
      <Box sx={{ bgcolor: 'secondary.light', py: 8 }}>
        <Container maxWidth="sm">
          <Typography variant="h4" align="center" gutterBottom>
            Ready to Find Your Perfect Cup?
          </Typography>
          <Typography align="center" sx={{ mb: 4 }}>
            Join thousands of coffee lovers who have already discovered their new favorite spots.
          </Typography>
          <Box sx={{ textAlign: 'center' }}>
            <Button 
              variant="contained"
              size="large"
              onClick={() => navigate('/map')}
              sx={{ 
                px: 4, 
                py: 2,
                fontSize: '1.2rem'
              }}
            >
              Get Started Now
            </Button>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}

export default LandingPage; 