// /.netlify/functions/supabase-proxy.js
// Minimal proxy for aicrochet.org - auth + voice + pattern requests

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

exports.handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const respond = (obj, code = 200) => {
    const allowed = new Set([
      'https://aicrochet.org',
      'https://www.aicrochet.org',
      'https://aicrochet-org.netlify.app',
      'http://localhost:8888'
    ]);
    const origin = event.headers.origin || event.headers.Origin || '';
    const allowOrigin = allowed.has(origin) ? origin : '*';

    return {
      statusCode: code,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': allowOrigin,
        'Vary': 'Origin',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      },
      body: JSON.stringify(obj),
    };
  };

  // Parse body
  let parsed;
  try {
    if (!event.body) throw new Error('Missing body');
    parsed = JSON.parse(event.body);
  } catch (err) {
    return respond({ error: 'Invalid JSON', details: err.message }, 400);
  }

  const { action, payload } = parsed || {};
  const authHeader = event.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: true },
    global: { headers: token ? { Authorization: `Bearer ${token}` } : {} },
  });

  const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  try {
    // Resolve user if token present
    let user = null;
    if (token) {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
      if (!authError && authUser) {
        user = authUser;
      }
    }

    switch (action) {
      // ============ AUTH ============
      case 'signIn': {
        const { data, error } = await supabase.auth.signInWithPassword(payload);
        if (error) return respond({ error: error.message }, 400);
        return respond({ data });
      }

      case 'signUp': {
        const { email, password, display_name, redirectTo } = payload || {};
        if (!email || !password) {
          return respond({ error: 'Missing email or password' }, 400);
        }
        const redirectUrl = redirectTo || 'https://aicrochet.org/';

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl,
            data: { display_name: display_name || null },
          },
        });
        if (error) return respond({ error: error.message }, 400);

        // Create profile
        if (data?.user && display_name) {
          await adminSupabase
            .from('profiles')
            .upsert({
              id: data.user.id,
              email: email,
              display_name: (display_name || '').trim(),
              role: 'USER'
            }, { onConflict: 'id' });
        }
        return respond({ data });
      }

      case 'signOut': {
        const { error } = await supabase.auth.signOut();
        if (error) return respond({ error: error.message }, 400);
        return respond({ data: { success: true } });
      }

      case 'refreshSession': {
        const { refresh_token } = payload || {};
        if (!refresh_token) {
          return respond({ error: 'Missing refresh_token' }, 400);
        }
        const { data, error } = await supabase.auth.refreshSession({ refresh_token });
        if (error) return respond({ error: error.message }, 401);
        return respond({ data });
      }

      case 'getProfile': {
        if (!user) return respond({ error: 'Not authenticated' }, 401);
        const { data, error } = await supabase
          .from('profiles')
          .select('display_name, email, role')
          .eq('id', user.id)
          .single();
        if (error) return respond({ error: error.message }, 400);
        return respond({ data });
      }

      case 'getUserRole': {
        if (!user) return respond({ error: 'Not authenticated' }, 401);
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        if (error) return respond({ error: error.message }, 400);
        return respond({ data });
      }

      // ============ VOICE PROFILES ============
      case 'getVoiceProfile': {
        const { email } = payload || {};
        if (!email) return respond({ error: 'Missing email' }, 400);

        const { data, error } = await supabase
          .from('voice_profiles')
          .select('*')
          .eq('user_email', email)
          .single();
        if (error && error.code !== 'PGRST116') return respond({ error: error.message }, 400);
        return respond({ data });
      }

      case 'createVoiceProfile': {
        const { user_email, display_name, voice_sample_url } = payload || {};
        if (!user_email) return respond({ error: 'Missing user_email' }, 400);

        const { data, error } = await adminSupabase
          .from('voice_profiles')
          .upsert({
            user_email,
            display_name,
            voice_sample_url,
            status: 'pending'
          }, { onConflict: 'user_email' })
          .select()
          .single();
        if (error) return respond({ error: error.message }, 400);
        return respond({ data });
      }

      case 'updateVoiceProfile': {
        if (!user) return respond({ error: 'Not authenticated' }, 401);
        const { updates } = payload || {};

        const { data, error } = await supabase
          .from('voice_profiles')
          .update(updates)
          .eq('user_email', user.email)
          .select()
          .single();
        if (error) return respond({ error: error.message }, 400);
        return respond({ data });
      }

      // ============ VOICE PREFERENCES ============
      case 'getVoicePreferences': {
        if (!user) return respond({ error: 'Not authenticated' }, 401);

        const { data, error } = await supabase
          .from('voice_preferences')
          .select('*')
          .eq('user_email', user.email)
          .single();
        if (error && error.code !== 'PGRST116') return respond({ error: error.message }, 400);
        return respond({ data });
      }

      case 'updateVoicePreferences': {
        if (!user) return respond({ error: 'Not authenticated' }, 401);
        const { updates } = payload || {};

        const { data, error } = await supabase
          .from('voice_preferences')
          .upsert({
            user_email: user.email,
            ...updates
          }, { onConflict: 'user_email' })
          .select()
          .single();
        if (error) return respond({ error: error.message }, 400);
        return respond({ data });
      }

      // ============ COMMUNITY VOICES ============
      case 'getCommunityVoices': {
        const { data, error } = await supabase
          .from('community_voices')
          .select('owner_email, display_name, description');
        if (error) return respond({ error: error.message }, 400);
        return respond({ data });
      }

      case 'joinCommunityVoices': {
        if (!user) return respond({ error: 'Not authenticated' }, 401);
        const { display_name, description } = payload || {};

        const { data, error } = await supabase
          .from('community_voices')
          .upsert({
            owner_email: user.email,
            display_name: display_name || user.email.split('@')[0],
            description: description || 'Community voice'
          }, { onConflict: 'owner_email' })
          .select()
          .single();
        if (error) return respond({ error: error.message }, 400);
        return respond({ data });
      }

      case 'leaveCommunityVoices': {
        if (!user) return respond({ error: 'Not authenticated' }, 401);

        const { error } = await supabase
          .from('community_voices')
          .delete()
          .eq('owner_email', user.email);
        if (error) return respond({ error: error.message }, 400);
        return respond({ data: { success: true } });
      }

      // ============ PATTERN REQUESTS ============
      case 'submitPatternRequest': {
        const { name, email, pattern_request } = payload || {};
        if (!name || !pattern_request) {
          return respond({ error: 'Missing name or pattern_request' }, 400);
        }

        const { data, error } = await adminSupabase
          .from('pattern_requests')
          .insert({
            name,
            email: email || null,
            pattern_request,
            status: 'pending'
          })
          .select()
          .single();
        if (error) return respond({ error: error.message }, 400);
        return respond({ data });
      }

      case 'getPatternRequests': {
        // Public - shows approved patterns
        const { data, error } = await supabase
          .from('pattern_requests')
          .select('id, name, pattern_request, status, created_at')
          .eq('status', 'approved')
          .order('created_at', { ascending: false });
        if (error) return respond({ error: error.message }, 400);
        return respond({ data });
      }

      // ============ ADS ============
      case 'getAds': {
        const { zone } = payload || {};
        let query = supabase
          .from('ads')
          .select('*')
          .eq('active', true);

        if (zone) {
          query = query.contains('zones', [zone]);
        }

        const { data, error } = await query;
        if (error) return respond({ error: error.message }, 400);
        return respond({ data });
      }

      default:
        return respond({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (err) {
    console.error('Proxy error:', err);
    return respond({ error: err.message || 'Internal error' }, 500);
  }
};
