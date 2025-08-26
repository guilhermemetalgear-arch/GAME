import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { userId, userName, points } = JSON.parse(event.body);

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return {
      statusCode: 500,
      body: 'Supabase URL or Service Role Key not set in environment variables.',
    };
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { data, error } = await supabase
      .from('scores')
      .insert([{
        user_id: userId,
        user_name: userName,
        points: points
      }]);

    if (error) {
      console.error('Error inserting score:', error);
      return {
        statusCode: 500,
        body: `Error inserting score: ${error.message}`,
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Score saved successfully!', data }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: `Internal Server Error: ${error.message}`,
    };
  }
};