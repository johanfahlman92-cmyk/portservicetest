import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://ldjfdzayedjkwmdcjcmd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkamZkemF5ZWRqa3dtZGNqY21kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzMDY4NzgsImV4cCI6MjA5NDg4Mjg3OH0.2b20h5u9uTDv3amTc3aWJe7otcXqYktI4vv4DyFQpzY'
)
