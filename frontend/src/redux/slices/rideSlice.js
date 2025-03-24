import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

// Create a new ride
export const createRide = createAsyncThunk(
  'rides/ride',
  async (rideData, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/rides/ride`, rideData, {
        withCredentials: true
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

// Fetch available rides
export const fetchAvailableRides = createAsyncThunk(
  'rides/fetch-rides',
  async (searchParams, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/rides/fetch-rides`, searchParams, {
        withCredentials: true
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

// Book a ride
export const bookRide = createAsyncThunk(
  'rides/book',
  async ({ rideId, seatsToBook }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/rides/book-rides`, 
        { rideId, seatsToBook },
        { withCredentials: true }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

// Start a ride
export const startRide = createAsyncThunk(
  'rides/start',
  async (rideId, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/rides/${rideId}/start`, {}, {
        withCredentials: true
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

// Complete a ride
export const completeRide = createAsyncThunk(
  'rides/complete',
  async (rideId, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/rides/${rideId}/complete`, {}, {
        withCredentials: true
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

// Fetch user's rides (as a rider)
export const fetchMyRides = createAsyncThunk(
  'rides/fetchMyRides',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/rides/my-rides`, {
        withCredentials: true
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

// Fetch user's bookings
export const fetchMyBookings = createAsyncThunk(
  'rides/fetchMyBookings',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/rides/my-bookings`, {
        withCredentials: true
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: 'Failed to fetch bookings' });
    }
  }
);

export const cancelRide = createAsyncThunk(
    'rides/cancel',
    async (rideId, { rejectWithValue }) => {
        try {
            const response = await axios.post(`${API_URL}/rides/${rideId}/cancel`, {}, {
                withCredentials: true
            });
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response.data);
        }
    }
);

const initialState = {
  availableRides: [],
  myRides: [],
  myBookings: [],
  currentRide: null,
  isLoading: false,
  error: null,
  searchParams: {
    origin: '',
    destination: '',
    date: '',
    minSeats: 1
  }
};

const rideSlice = createSlice({
  name: 'rides',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setSearchParams: (state, action) => {
      state.searchParams = action.payload;
    },
    clearCurrentRide: (state) => {
      state.currentRide = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Create Ride
      .addCase(createRide.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createRide.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentRide = action.payload.ride;
        state.myRides.unshift(action.payload.ride);
      })
      .addCase(createRide.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload?.message || 'Failed to create ride';
      })

      // Fetch Available Rides
      .addCase(fetchAvailableRides.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAvailableRides.fulfilled, (state, action) => {
        state.isLoading = false;
        state.availableRides = action.payload.rides;
      })
      .addCase(fetchAvailableRides.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload?.message || 'Failed to fetch rides';
      })

      // Book Ride
      .addCase(bookRide.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(bookRide.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentRide = action.payload.ride;
        state.myBookings.unshift(action.payload.ride);
      })
      .addCase(bookRide.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload?.message || 'Failed to book ride';
      })

      // Start Ride
      .addCase(startRide.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(startRide.fulfilled, (state, action) => {
        state.isLoading = false;
        const rideId = action.payload.rideDetails.rideId;
        state.myRides = state.myRides.map(ride =>
          ride._id === rideId ? { ...ride, status: 'started' } : ride
        );
      })
      .addCase(startRide.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload?.message || 'Failed to start ride';
      })

      // Complete Ride
      .addCase(completeRide.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(completeRide.fulfilled, (state, action) => {
        state.isLoading = false;
        const rideId = action.payload.rideDetails.rideId;
        state.myRides = state.myRides.map(ride =>
          ride._id === rideId ? { ...ride, status: 'completed' } : ride
        );
      })
      .addCase(completeRide.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload?.message || 'Failed to complete ride';
      })

      // Fetch My Rides
      .addCase(fetchMyRides.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMyRides.fulfilled, (state, action) => {
        state.isLoading = false;
        state.myRides = action.payload.rides;
      })
      .addCase(fetchMyRides.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload?.message || 'Failed to fetch your rides';
      })

      // Fetch My Bookings
      .addCase(fetchMyBookings.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMyBookings.fulfilled, (state, action) => {
        state.isLoading = false;
        state.myBookings = action.payload.bookings;
      })
      .addCase(fetchMyBookings.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload?.message || 'Failed to fetch your bookings';
      })

      // Cancel Ride
      .addCase(cancelRide.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(cancelRide.fulfilled, (state, action) => {
        state.isLoading = false;
        state.myBookings = state.myBookings.map(booking =>
          booking._id === action.payload.ride._id
            ? { ...booking, status: 'cancelled' }
            : booking
        );
      })
      .addCase(cancelRide.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload?.message || 'Failed to cancel ride';
      });
  },
});

export const { clearError, setSearchParams, clearCurrentRide } = rideSlice.actions;
export default rideSlice.reducer; 