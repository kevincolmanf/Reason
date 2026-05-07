require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const csv = require('csv-parser');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const results = [];

fs.createReadStream('exercises_unificados.csv')
  .pipe(csv())
  .on('data', (data) => {
    results.push({
      id: data.id,
      name: data.name,
      youtube_url: data.youtube_url || null,
      category: data.category,
      equipment: data.equipment || null,
      pattern: data.pattern || null,
      contraction_type: data.contraction_type || null,
      exercise_type: data.exercise_type || null
    });
  })
  .on('end', async () => {
    console.log(`Uploading ${results.length} exercises to Supabase...`);
    
    const BATCH_SIZE = 100;
    let successCount = 0;
    
    for (let i = 0; i < results.length; i += BATCH_SIZE) {
      const batch = results.slice(i, i + BATCH_SIZE);
      const { data, error } = await supabase
        .from('exercises')
        .insert(batch);
        
      if (error) {
        console.error('Error in batch:', i, error.message);
      } else {
        successCount += batch.length;
        console.log(`Uploaded ${successCount}/${results.length}`);
      }
    }
    
    console.log('Done!');
  });
