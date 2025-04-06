import { createTheme } from '@mui/material';

export const theme = createTheme({
  palette: {
    primary: {
      main: '#6F4E37', // Coffee brown
    },
    secondary: {
      main: '#C4A484', // Light coffee
    },
    background: {
      default: '#FDF5E6', // Light cream
    }
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 20,
        },
      },
    },
  },
}); 