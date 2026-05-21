export const objekt = []

export const arenden = []

export const tekniker = []

export const kunder = []

export const statusConfig = {
  ok:       { label: 'OK',            cls: 'badge-green',  color: 'var(--c-teal)' },
  arende:   { label: 'Ärende',        cls: 'badge-coral',  color: 'var(--c-coral)' },
  signatur: { label: 'Signatur',      cls: 'badge-amber',  color: 'var(--c-amber)' },
  forsenad: { label: 'Försenad',      cls: 'badge-red',    color: 'var(--c-red)' },
  ny:       { label: 'Ny',            cls: 'badge-purple', color: 'var(--c-purple)' },
  snart:    { label: 'Service snart', cls: 'badge-amber',  color: 'var(--c-amber)' },
}

export const protokollTyper = {
  'Vikport':      { punkter: 23, sektioner: ['Portmekanism', 'El & motor'] },
  'Takskjutport': { punkter: 35, sektioner: ['Konstruktion', 'Säkerhetsfunktioner', 'El & motor'] },
  'Lastbrygga':   { punkter: 27, sektioner: ['Mekanik', 'Hydraulik', 'Vädertätning', 'El'] },
  'Grind':        { punkter: 35, sektioner: ['Grindmekanism', 'Säkerhetsfunktioner', 'El & motor'] },
}

export const protokollPunkter = {
  Vikport: [
    'Sektioner', 'Sektionstätning', 'Topptätning', 'Uppställningsbeslag',
    'Styrhjulsbeslag', 'Vikbeslag (Mitten)', 'Kantgångjärn', 'Fönster',
    'Bottenbeslag/styrdubb', 'Lås / Spanjolett', 'Låsbrytare', 'Klämskyddsprofil',
    'Sidotätning / Petskydd', 'Infästning', 'Drivkedja / Kuggrem',
    'Kuggväxel (Olja / Fett)', 'Elkablar', 'Motorskydd', 'Momentvakt',
    'Klämskydd', 'Frikoppling', 'Stoppdon', 'Övrigt',
  ],
  Takskjutport: [
    'Takpanel / Sektioner', 'Tätningslister', 'Vägganslutning', 'Sidostyrning / Räls',
    'Takkonstruktion', 'Bärbeslag', 'Liftbeslag', 'Fjäderbeslag',
    'Stödhjul', 'Golvtätning', 'Fönster / Spegel', 'Infästning',
    'Klämskydd nere', 'Klämskydd sida', 'Fotocell / Rörelsedetektor',
    'Stoppdon vid öppet', 'Stoppdon vid stängt', 'Manuell frikoppling',
    'Varningsetiketter', 'Momentvakt', 'Reversering', 'Nödstopp',
    'Lås / Låsbrytare', 'Motor', 'Elkablar', 'Kontrollpanel',
    'Motorskydd / Säkring', 'Fjärrkontroll', 'Kodsändare',
    'Signalhorn / Varningslampa', 'Tidprogrammering', 'Jordning',
    'Frekvensomriktare', 'Säkerhetsanordningar', 'Övrigt',
  ],
  Lastbrygga: [
    'Rampplatta', 'Läppplatta', 'Sidostycken', 'Fjädrar',
    'Gångjärn', 'Stödben / Säkerhetsben', 'Slitytor', 'Infästning',
    'Hydraulcylinder', 'Hydraulslang', 'Hydraulpump', 'Hydraulolja (nivå/kvalitet)',
    'Hydraultätningar', 'Hydraulkopplingar', 'Hydraultank',
    'Bakre tätning', 'Sidotätning vänster', 'Sidotätning höger',
    'Manteltätning', 'Golvtätning / Anpressning',
    'Motor', 'Elkablar', 'Kontrollpanel', 'Nödstopp',
    'Säkerhetsreläer', 'Magnetventil', 'Övrigt',
  ],
  Grind: [
    'Grindblad', 'Stolpe vänster', 'Stolpe höger', 'Övre styrning',
    'Nedre styrning / Löphjul', 'Kedja / Rem', 'Kuggstång / Kugghjul',
    'Frikoppling', 'Lås', 'Spanjolett', 'Gångjärn', 'Markfundament', 'Ytor / Lack',
    'Fotocell inåt', 'Fotocell utåt', 'Trycklist / Klämskydd',
    'Stoppdon vid öppet', 'Stoppdon vid stängt', 'Momentvakt',
    'Reversering', 'Nödstopp', 'Varningsskylt', 'Hinderdetektion',
    'Radiobrytare', 'Induktiv slinga',
    'Motor', 'Elkablar', 'Motorskydd', 'Kontrollpanel / Styrenhet',
    'Fjärrkontroll', 'Kodsändare', 'Signalhorn / Lampa',
    'Jordning', 'Frekvensomriktare', 'Övrigt',
  ],
}
