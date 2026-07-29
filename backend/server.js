require('dotenv').config();

const express = require('express');
const cors = require('cors');

const summaryRoutes = require('./routes/summary');
const aiRoutes = require('./routes/ai');
const pushRoutes = require('./routes/push');
const { startScheduler } = require('./services/schedulerService');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    message: 'Backend Daya opérationnel',
  });
});

app.use('/api/summary', summaryRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/push', pushRoutes);

const PORT = process.env.PORT || 4000;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`Serveur lancé sur http://${HOST}:${PORT}`);
  startScheduler();
});