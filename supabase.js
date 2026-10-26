import { createClient } from "@supabase/supabase-js";
const url = "https://cbyldvjlhfzuxqxtnyst.supabase.co";
const key = "sb_publishable_FTKUMBYMb44BvVJ4aYUtkw_V_fkEKBn";
export const supabase = createClient(url, key);
