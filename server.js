// Admin: slots CRUD (z walidacją i czytelnymi błędami)
app.post('/api/slots', requireAuth, async (req, res) => {
  try {
    let { date, time, duration } = req.body || {};

    // duration może przyjść jako string -> zamieniamy
    duration = typeof duration === 'string' ? parseInt(duration, 10) : duration;

    // Walidacje wejścia
    if (!date || !time || !duration || isNaN(duration) || duration <= 0) {
      return res.status(400).json({
        error: 'bad_request',
        message: 'Podaj datę (YYYY-MM-DD), godzinę (HH:mm) i czas trwania w minutach (>0).'
      });
    }

    const start = DateTime.fromISO(`${date}T${time}`, { zone: 'Europe/Warsaw' });
    if (!start.isValid) {
      return res.status(400).json({
        error: 'bad_request',
        message: 'Nieprawidłowa data lub godzina.'
      });
    }

    const startUTC = start.toUTC();
    const endUTC = startUTC.plus({ minutes: duration });

    const slot = await prisma.slot.create({
      data: { startAt: startUTC.toJSDate(), endAt: endUTC.toJSDate(), capacity: 1 }
    });

    return res.json({ ok: true, slot });
  } catch (e) {
    console.error('Create slot error:', e);
    // P2002 = unique constraint (czyli dokładny duplikat w bazie)
    if (e.code === 'P2002') {
      return res.status(409).json({
        error: 'duplicate',
        message: 'Taki termin już istnieje.'
      });
    }
    return res.status(500).json({ error: 'server_error', message: 'Błąd serwera przy tworzeniu slotu.' });
  }
});
