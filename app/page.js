'use client';
import { useState, useEffect } from 'react';
import { firestore } from '@/firebase';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { Box, Modal, Stack, Typography, TextField, Button, InputAdornment, Paper, Container, IconButton, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Select, MenuItem, Snackbar, Alert, AlertTitle, FormControl, InputLabel, Tabs, Tab } from '@mui/material';
import { collection, deleteDoc, doc, query, getDocs, setDoc, getDoc } from 'firebase/firestore';
import SearchIcon from '@mui/icons-material/Search';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import SaveIcon from '@mui/icons-material/Save';
import OrderIcon from '@mui/icons-material/ShoppingCart';
import InventoryIcon from '@mui/icons-material/Inventory';
import Grid from '@mui/material/Grid';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#000000',
    },
    background: {
      default: '#f5f5f5',
    },
  },
});

export default function Home() {
  const [inventory, setInventory] = useState([]);
  const [open, setOpen] = useState(false);
  const [itemName, setItemName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [editItem, setEditItem] = useState(null);
  const [editPrice, setEditPrice] = useState(null);
  const [newPrice, setNewPrice] = useState('');
  const [openPriceDialog, setOpenPriceDialog] = useState(false);
  const [openOrderDialog, setOpenOrderDialog] = useState(false);
  const [orders, setOrders] = useState([]);
  const [orderItemName, setOrderItemName] = useState('');
  const [orderQuantity, setOrderQuantity] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [otherItemName, setOtherItemName] = useState('');
  const [editOrder, setEditOrder] = useState(null);
  const [openEditOrderDialog, setOpenEditOrderDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [receivedDates, setReceivedDates] = useState([]);
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };


  const updateInventory = async () => {
    const snapshot = query(collection(firestore, 'inventory'));
    const docs = await getDocs(snapshot);
    const inventoryList = [];
    docs.forEach((doc) => {
      inventoryList.push({
        name: doc.id,
        ...doc.data(),
      });
    });
    setInventory(inventoryList);

    const dates = [...new Set(inventoryList.flatMap(item => item.receivedDates || []))];
    setReceivedDates(dates.sort((a, b) => new Date(b) - new Date(a)));
  };

  const updateInventoryFromOrder = async (order) => {
    const { item, quantity, receivedDate } = order;
    const docRef = doc(collection(firestore, 'inventory'), item);
    const docSnap = await getDoc(docRef);
  
    if (docSnap.exists()) {
      const currentData = docSnap.data();
      const updatedQuantity = (currentData.quantity || 0) + parseInt(quantity);
      const updatedReceivedDates = [...(currentData.receivedDates || []), receivedDate];
      await setDoc(docRef, { 
        ...currentData, 
        quantity: updatedQuantity, 
        receivedDates: updatedReceivedDates 
      }, { merge: true });
    } else {
      await setDoc(docRef, { 
        quantity: parseInt(quantity), 
        price: 0, 
        receivedDates: [receivedDate] 
      });
    }
    await updateInventory();
  };

  const updateInventoryFromOrderEdit = async (oldOrder, newOrder) => {
    const inventoryRef = doc(collection(firestore, 'inventory'), oldOrder.item);
    const inventorySnap = await getDoc(inventoryRef);
  
    if (inventorySnap.exists()) {
      const currentData = inventorySnap.data();
      let updatedQuantity = currentData.quantity;

      updatedQuantity -= parseInt(oldOrder.quantity);

      updatedQuantity += parseInt(newOrder.quantity);
  
      await setDoc(inventoryRef, { ...currentData, quantity: updatedQuantity }, { merge: true });
    }
    if (oldOrder.item !== newOrder.item) {
      const newInventoryRef = doc(collection(firestore, 'inventory'), newOrder.item);
      const newInventorySnap = await getDoc(newInventoryRef);
  
      if (newInventorySnap.exists()) {
        const currentData = newInventorySnap.data();
        const updatedQuantity = (currentData.quantity || 0) + parseInt(newOrder.quantity);
        await setDoc(newInventoryRef, { ...currentData, quantity: updatedQuantity }, { merge: true });
      } else {
        await setDoc(newInventoryRef, { quantity: parseInt(newOrder.quantity), price: 0 });
      }
    }
  
    await updateInventory();
  };


  const updateOrders = async () => {
    const snapshot = query(collection(firestore, 'orders'));
    const docs = await getDocs(snapshot);
    const orderList = [];
    docs.forEach((doc) => {
      orderList.push({
        id: doc.id,
        ...doc.data(),
      });
    });
    setOrders(orderList);
  };

  const addItem = async (item) => {
    if (!item) {
      console.error('Item name is empty');
      return;
    }

    const docRef = doc(collection(firestore, 'inventory'), item);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const { quantity, price } = docSnap.data();
      await setDoc(docRef, { quantity: quantity + 1, price });
    } else {
      await setDoc(docRef, { quantity: 1, price: 0 });
    }
    await updateInventory();
  };

  const removeItem = async (item) => {
    const docRef = doc(collection(firestore, 'inventory'), item);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const { quantity, price } = docSnap.data();
      if (quantity == 1) {
        await deleteDoc(docRef);
      } else {
        await setDoc(docRef, { quantity: quantity - 1, price });
      }
    }
    await updateInventory();
  };

  const deleteItem = async (item) => {
    const docRef = doc(collection(firestore, 'inventory'), item);
    await deleteDoc(docRef);
    await updateInventory();
  };

  const updateItem = async (item, newName) => {
    if (!newName || newName === item) return;

    const oldDocRef = doc(collection(firestore, 'inventory'), item);
    const newDocRef = doc(collection(firestore, 'inventory'), newName);

    const oldDocSnap = await getDoc(oldDocRef);
    if (oldDocSnap.exists()) {
      const data = oldDocSnap.data();
      await setDoc(newDocRef, data);
      await deleteDoc(oldDocRef);
      await updateInventory();
    }
  };

  const updatePrice = async (item, newPrice) => {
    const docRef = doc(collection(firestore, 'inventory'), item);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const { quantity } = docSnap.data();
      await setDoc(docRef, { quantity, price: parseFloat(newPrice) });
      await updateInventory();
    }
  };

  const placeOrder = async (item, quantity) => {
    if (!item || !quantity) return;
    const newOrder = {
      item,
      quantity,
      status: 'Order placed',
      receivedDate: null,
    };
    await setDoc(doc(collection(firestore, 'orders')), newOrder);
    await updateOrders();
  };

  const handleStatusChange = async (orderId, newStatus) => {
    const orderRef = doc(collection(firestore, 'orders'), orderId);
    const orderSnap = await getDoc(orderRef);
  
    if (orderSnap.exists()) {
      const orderData = orderSnap.data();
      const updatedOrder = { 
        ...orderData, 
        status: newStatus,
        receivedDate: newStatus === 'Order Received' ? new Date().toISOString() : null
      };
      await setDoc(orderRef, updatedOrder);
      if (newStatus === 'Order Received') {
        await updateInventoryFromOrder(updatedOrder);
      }
      await updateOrders();
    }
  };

  const handleDateChange = async (orderId, newDate) => {
    const orderRef = doc(collection(firestore, 'orders'), orderId);
    const orderSnap = await getDoc(orderRef);
  
    if (orderSnap.exists()) {
      const orderData = orderSnap.data();
      const updatedOrder = { 
        ...orderData, 
        receivedDate: newDate ? new Date(newDate).toISOString() : null
      };
      await setDoc(orderRef, updatedOrder);
      await updateOrders();
    }
  };

  const deleteOrder = async (orderId) => {
    const orderRef = doc(collection(firestore, 'orders'), orderId);
    await deleteDoc(orderRef);
    await updateOrders();
  };

  const handleEditOrder = (order) => {
    setEditOrder(order);
    setOrderItemName(order.item);
    setOrderQuantity(order.quantity);
    setOpenEditOrderDialog(true);
  };

  const handleSaveEditOrder = async () => {
    if (!editOrder) return;
  
    const orderRef = doc(collection(firestore, 'orders'), editOrder.id);
    const updatedOrder = {
      ...editOrder,
      item: orderItemName,
      quantity: orderQuantity,
    };
  
    if (editOrder.status === 'Order Received') {
      await updateInventoryFromOrderEdit(editOrder, updatedOrder);
    }
  
    await setDoc(orderRef, updatedOrder);
    await updateOrders();
    setOpenEditOrderDialog(false);
    setEditOrder(null);
    setOrderItemName('');
    setOrderQuantity('');
  };

  useEffect(() => {
    updateInventory();
    updateOrders();
  }, []);

  useEffect(() => {
    const lowStock = inventory.filter(item => item.quantity < 5);
    setLowStockItems(lowStock);
  }, [inventory]);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const handleOpenPriceDialog = (item, price) => {
    setEditPrice(item);
    setNewPrice(price ? price.toString() : '0.00');
    setOpenPriceDialog(true);
  };

  const handleClosePriceDialog = () => {
    setOpenPriceDialog(false);
    setEditPrice(null);
    setNewPrice('');
  };

  const handleSavePrice = () => {
    updatePrice(editPrice, newPrice);
    handleClosePriceDialog();
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  const filteredInventory = inventory.filter((item) => {
    const nameMatch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const dateMatch = selectedDate ? 
      (item.receivedDates && item.receivedDates.includes(selectedDate)) : true;
    return nameMatch && dateMatch;
  });

  return (
    <ThemeProvider theme={theme}>
      <Container maxWidth="md">
        <Box
          minHeight="100vh"
          display="flex"
          flexDirection="column"
          justifyContent="center"
          alignItems="center"
          py={4}
        >
          <Tabs value={activeTab} onChange={handleTabChange} aria-label="inventory tabs">
            <Tab label="Inventory Items" icon={<InventoryIcon />} />
            <Tab label="Supplier Orders" icon={<OrderIcon />} />
          </Tabs>
  
          {activeTab === 0 && (
            <>
              <IconButton color="primary" onClick={handleOpen} sx={{ mb: 3, mt: 2 }}>
                <AddIcon />
              </IconButton>
              <Paper elevation={3} sx={{ width: '100%', overflow: 'hidden' }}>
                <Box p={3} bgcolor="primary.main">
                  <Typography variant="h4" color="white" align="center">
                    Inventory Items
                  </Typography>
                </Box>
                <Box p={2} display="flex" justifyContent="space-between">
                  <TextField
                    variant="outlined"
                    placeholder="Search items..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon />
                        </InputAdornment>
                      ),
                    }}
                    sx={{ width: '60%' }}
                  />
                  <TextField
                    type="date"
                    label="Received Date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    InputLabelProps={{
                      shrink: true,
                    }}
                    sx={{ width: '35%' }}
                  />
                </Box>
                <Box maxHeight={400} overflow="auto">
                  <Grid container alignItems="center" justifyContent="space-between" sx={{ p: 2, fontWeight: 'bold' }}>
                    <Grid item xs={3}>
                      <Typography variant="subtitle1">Item Name</Typography>
                    </Grid>
                    <Grid item xs={2}>
                      <Typography variant="subtitle1" sx={{ textAlign: 'center' }}>Quantity</Typography>
                    </Grid>
                    <Grid item xs={2}>
                      <Typography variant="subtitle1" sx={{ textAlign: 'center' }}>Cost per Unit</Typography>
                    </Grid>
                    <Grid item xs={5}>
                      <Typography variant="subtitle1" sx={{ textAlign: 'right' }}>Actions</Typography>
                    </Grid>
                  </Grid>
                  {filteredInventory.map(({ name, quantity, price, receivedDates }) => (
                    <Paper
                      key={name}
                      elevation={1}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        p: 2,
                        m: 2,
                      }}
                    >
                      <Grid container alignItems="center" justifyContent="space-between">
                        <Grid item xs={3}>
                          <Typography variant="h6">
                            {name.charAt(0).toUpperCase() + name.slice(1)}
                          </Typography>
                        </Grid>
                        <Grid item xs={2}>
                          <Typography 
                            variant="h6" 
                            sx={{ 
                              textAlign: 'center',
                              color: quantity < 5 ? 'error.main' : 'inherit'
                            }}
                          >
                            {quantity}
                          </Typography>
                        </Grid>
                        <Grid item xs={2}>
                          <Typography 
                            variant="h6" 
                            sx={{ textAlign: 'center', cursor: 'pointer' }}
                            onClick={() => handleOpenPriceDialog(name, price)}
                          >
                            ${price ? price.toFixed(2) : '0.00'}
                          </Typography>
                        </Grid>
                        <Grid item xs={5}>
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <IconButton
                              color="primary"
                              onClick={() => addItem(name)}
                            >
                              <AddIcon />
                            </IconButton>
                            <IconButton
                              color="primary"
                              onClick={() => removeItem(name)}
                            >
                              <RemoveIcon />
                            </IconButton>
                            <IconButton
                              color="primary"
                              onClick={() => {
                                setEditItem(name)
                                setItemName(name)
                                handleOpen()
                              }}
                            >
                              <EditIcon />
                            </IconButton>
                            <IconButton
                              color="error"
                              onClick={() => deleteItem(name)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Stack>
                        </Grid>
                      </Grid>
                    </Paper>
                  ))}
                </Box>
              </Paper>
              {lowStockItems.length > 0 && (
                <Alert severity="warning" sx={{ mt: 3, width: '100%' }}>
                  <AlertTitle>Low Stock Items</AlertTitle>
                  The following items are running low and need to be ordered:
                  <ul>
                    {lowStockItems.map(item => (
                      <li key={item.name}>{item.name} (Quantity: {item.quantity})</li>
                    ))}
                  </ul>
                </Alert>
              )}
            </>
          )}
  
          {activeTab === 1 && (
            <>
              <Paper elevation={3} sx={{ width: '100%', overflow: 'hidden', mt: 3 }}>
                <Box p={3} bgcolor="primary.main">
                  <Typography variant="h4" color="white" align="center">
                    Supplier Orders
                  </Typography>
                </Box>
                <Box p={2}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => setOpenOrderDialog(true)}
                  >
                    Place Order
                  </Button>
                </Box>
                <Box maxHeight={400} overflow="auto">
                  <Grid container alignItems="center" justifyContent="space-between" sx={{ p: 2, fontWeight: 'bold' }}>
                    <Grid item xs={2}>
                      <Typography variant="subtitle1">Item Name</Typography>
                    </Grid>
                    <Grid item xs={1}>
                      <Typography variant="subtitle1" sx={{ textAlign: 'center' }}>Quantity</Typography>
                    </Grid>
                    <Grid item xs={3}>
                      <Typography variant="subtitle1" sx={{ textAlign: 'center' }}>Received Date</Typography>
                    </Grid>
                    <Grid item xs={3}>
                      <Typography variant="subtitle1" sx={{ textAlign: 'center' }}>Update Status</Typography>
                    </Grid>
                    <Grid item xs={1}>
                      <Typography variant="subtitle1" sx={{ textAlign: 'center' }}>Edit</Typography>
                    </Grid>
                    <Grid item xs={1}>
                      <Typography variant="subtitle1" sx={{ textAlign: 'center' }}>Delete</Typography>
                    </Grid>
                  </Grid>
                  {orders.map((order) => (
                    <Paper
                      key={order.id}
                      elevation={1}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        p: 2,
                        m: 2,
                      }}
                    >
                      <Grid container alignItems="center" justifyContent="space-between">
                        <Grid item xs={2}>
                          <Typography variant="h6">{order.item}</Typography>
                        </Grid>
                        <Grid item xs={1}>
                          <Typography variant="h6" sx={{ textAlign: 'center' }}>
                            {order.quantity}
                          </Typography>
                        </Grid>
                        <Grid item xs={3}>
                          <TextField
                            type="date"
                            value={order.receivedDate ? order.receivedDate.split('T')[0] : ''}
                            onChange={(e) => handleDateChange(order.id, e.target.value)}
                            disabled={order.status !== 'Order Received'}
                            fullWidth
                            InputLabelProps={{
                              shrink: true,
                            }}
                          />
                        </Grid>
                        <Grid item xs={3}>
                          <FormControl variant="outlined" fullWidth>
                            <InputLabel>Status</InputLabel>
                            <Select
                              value={order.status}
                              onChange={(e) => handleStatusChange(order.id, e.target.value)}
                              label="Status"
                            >
                              <MenuItem value="Order placed">Order placed</MenuItem>
                              <MenuItem value="Order In Transit">Order In Transit</MenuItem>
                              <MenuItem value="Order Received">Order Received</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={1} sx={{ textAlign: 'center' }}>
                          <IconButton
                            color="primary"
                            onClick={() => handleEditOrder(order)}
                          >
                            <EditIcon />
                          </IconButton>
                        </Grid>
                        <Grid item xs={1} sx={{ textAlign: 'center' }}>
                          <IconButton
                            color="error"
                            onClick={() => deleteOrder(order.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Grid>
                      </Grid>
                    </Paper>
                  ))}
                </Box>
              </Paper>
            </>
          )}
  
          <Modal open={open} onClose={handleClose}>
            <Paper
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 400,
                p: 4,
                outline: 'none',
              }}
            >
              <Typography variant="h6" mb={2}>
                {editItem ? 'Edit Item' : 'Add Item'}
              </Typography>
              <Stack direction="row" spacing={2}>
                <TextField
                  variant="outlined"
                  fullWidth
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                />
                <IconButton
                  color="primary"
                  onClick={() => {
                    if (editItem) {
                      updateItem(editItem, itemName);
                      setEditItem(null);
                    } else {
                      addItem(itemName);
                    }
                    setItemName('');
                    handleClose();
                  }}
                >
                  <SaveIcon />
                </IconButton>
              </Stack>
            </Paper>
          </Modal>
  
          <Dialog open={openPriceDialog} onClose={handleClosePriceDialog}>
            <DialogTitle>Update Price</DialogTitle>
            <DialogContent>
              <DialogContentText>
                Enter the new price for {editPrice}:
              </DialogContentText>
              <TextField
                autoFocus
                margin="dense"
                label="Price"
                type="number"
                fullWidth
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={handleClosePriceDialog} color="primary">
                Cancel
              </Button>
              <Button onClick={handleSavePrice} color="primary">
                Save
              </Button>
            </DialogActions>
          </Dialog>
  
          <Dialog open={openOrderDialog} onClose={() => setOpenOrderDialog(false)}>
            <DialogTitle>Place Order</DialogTitle>
            <DialogContent>
              <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
                <InputLabel>Item</InputLabel>
                <Select
                  value={orderItemName}
                  onChange={(e) => setOrderItemName(e.target.value)}
                  label="Item"
                >
                  {lowStockItems.map(item => (
                    <MenuItem key={item.name} value={item.name}>
                      {item.name} (Current quantity: {item.quantity})
                    </MenuItem>
                  ))}
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>
              {orderItemName === 'other' && (
                <TextField
                  fullWidth
                  variant="outlined"
                  label="Other Item"
                  value={otherItemName}
                  onChange={(e) => setOtherItemName(e.target.value)}
                  sx={{ mb: 2 }}
                />
              )}
              <TextField
                fullWidth
                variant="outlined"
                label="Quantity"
                type="number"
                value={orderQuantity}
                onChange={(e) => setOrderQuantity(e.target.value)}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenOrderDialog(false)}>Cancel</Button>
              <Button
                onClick={() => {
                  const itemToOrder = orderItemName === 'other' ? otherItemName : orderItemName;
                  placeOrder(itemToOrder, orderQuantity);
                  setOrderItemName('');
                  setOtherItemName('');
                  setOrderQuantity('');
                  setOpenOrderDialog(false);
                  setSnackbarOpen(true);
                }}
              >
                Place Order
              </Button>
            </DialogActions>
          </Dialog>
  
          <Dialog open={openEditOrderDialog} onClose={() => setOpenEditOrderDialog(false)}>
            <DialogTitle>Edit Order</DialogTitle>
            <DialogContent>
              <TextField
                fullWidth
                variant="outlined"
                label="Item Name"
                value={orderItemName}
                onChange={(e) => setOrderItemName(e.target.value)}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                variant="outlined"
                label="Quantity"
                type="number"
                value={orderQuantity}
                onChange={(e) => setOrderQuantity(e.target.value)}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenEditOrderDialog(false)}>Cancel</Button>
              <Button onClick={handleSaveEditOrder}>Save</Button>
            </DialogActions>
          </Dialog>
  
          <Snackbar
            open={snackbarOpen}
            autoHideDuration={6000}
            onClose={handleSnackbarClose}
          >
            <Alert onClose={handleSnackbarClose} severity="success">
              Order placed successfully!
            </Alert>
          </Snackbar>
        </Box>
      </Container>
    </ThemeProvider>
  );
}