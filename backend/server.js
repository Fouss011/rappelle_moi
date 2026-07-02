require('dotenv').config();

const express = require('express');
const cors = require('cors');
const summaryRoutes = require('./routes/summary');
const { startScheduler } = require('./services/schedulerService');
const aiRoutes = require('./routes/ai');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    message: 'Backend RappelleMoi opérationnel',
  });
});

app.use('/api/summary', summaryRoutes);
app.use('/api/ai', aiRoutes);

const PORT = process.env.PORT || 4000;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`Serveur lancé sur http://${HOST}:${PORT}`);
  startScheduler();
});