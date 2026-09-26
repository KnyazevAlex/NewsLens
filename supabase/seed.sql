-- Idempotent demo content derived from the application's original mock data.
-- All demo sources are inactive and use the reserved .invalid TLD.

insert into public.sources (id, name, listing_url, parser_strategy, is_active)
values
  ('00000000-0000-4000-8000-000000000101', 'Reuters', 'https://www.bbc.com/news/articles/cq0m3pkmgg1ko', 'first_seed', true),

on conflict do nothing;

insert into public.articles (
  id, source_id, original_url, canonical_url, title, description, image_url,
  published_at, raw_text, categories, region, scraped_at, analyzed_at
)
values
  (
    '00000000-0000-4000-8000-000000000201',
    '00000000-0000-4000-8000-000000000101',
    'https://articles.example.invalid/artemis-ii-launch',
    'https://articles.example.invalid/artemis-ii-launch',
    'NASA successfully launches Artemis II mission to the Moon',
    'The Orion spacecraft launched from Kennedy Space Center, aiming to pave the way for future lunar exploration.',
    'https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?w=800&auto=format&fit=crop&q=80',
    '2025-05-15T13:15:00Z',
    E'Kennedy Space Center, FL — NASA''s Artemis II mission lifted off successfully today at 9:15 AM EDT, marking a critical step forward in the agency''s plan to return humans to the Moon.\n\nThe Orion spacecraft, carried by the Space Launch System (SLS) rocket, blasted off from Launch Complex 39B. The mission will carry four astronauts on a 10-day test flight around the Moon and back, validating systems for future Artemis missions.\n\n"Artemis II is about pushing the boundaries of exploration while preparing for humanity''s next giant leap," said NASA Administrator Bill Nelson.\n\nThe mission is part of NASA''s Artemis program, which aims to establish a sustainable human presence on the Moon and prepare for future missions to Mars.',
    array['Science', 'Space'],
    'United States',
    '2025-05-15T13:17:00Z',
    '2025-05-15T13:20:00Z'
  ),
  (
    '00000000-0000-4000-8000-000000000202',
    '00000000-0000-4000-8000-000000000102',
    'https://articles.example.invalid/markets-inflation-cooling',
    'https://articles.example.invalid/markets-inflation-cooling',
    'Markets rally as inflation data shows continued cooling',
    'The S&P 500 rises 1.2% as investors react to lower-than-expected inflation numbers and strong earnings.',
    'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&auto=format&fit=crop&q=80',
    '2025-05-15T13:00:00Z',
    E'Wall Street saw a broad rally on Thursday as new economic data confirmed that consumer price inflation continued to cool through the previous quarter.\n\nThe S&P 500 climbed 1.2%, while the tech-heavy Nasdaq Composite gained 1.6% following positive quarterly corporate earnings reports.\n\nEconomists note that the sustained downward trend in inflation opens the door for anticipated federal interest rate adjustments later this year.',
    array['Business', 'Economy'],
    'United States',
    '2025-05-15T13:02:00Z',
    '2025-05-15T13:05:00Z'
  ),
  (
    '00000000-0000-4000-8000-000000000203',
    '00000000-0000-4000-8000-000000000103',
    'https://articles.example.invalid/renewable-energy-2030',
    'https://articles.example.invalid/renewable-energy-2030',
    'Global leaders commit to tripling renewable energy capacity by 2030',
    'New landmark agreement signed at the Climate Summit aims to accelerate clean energy transition worldwide.',
    'https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=800&auto=format&fit=crop&q=80',
    '2025-05-15T12:30:00Z',
    'Global leaders signed a climate summit agreement intended to accelerate the expansion of renewable energy capacity by 2030.',
    array['Environment', 'Politics'],
    'Global',
    '2025-05-15T12:32:00Z',
    null
  ),
  (
    '00000000-0000-4000-8000-000000000204',
    '00000000-0000-4000-8000-000000000104',
    'https://articles.example.invalid/ai-startup-funding',
    'https://articles.example.invalid/ai-startup-funding',
    'AI startups raise record $8.2B in funding this quarter',
    'Investors continue to bet big on artificial intelligence as new applications emerge across industries.',
    'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&auto=format&fit=crop&q=80',
    '2025-05-15T12:00:00Z',
    'Artificial intelligence startups raised a record $8.2 billion during the quarter as investors funded new applications across industries.',
    array['Technology', 'Business'],
    'Global',
    '2025-05-15T12:02:00Z',
    null
  ),
  (
    '00000000-0000-4000-8000-000000000205',
    '00000000-0000-4000-8000-000000000105',
    'https://articles.example.invalid/senate-infrastructure-bill',
    'https://articles.example.invalid/senate-infrastructure-bill',
    'Senate passes bipartisan bill on infrastructure investment',
    'The $550B bill focuses on transportation, broadband, and clean water projects across the country.',
    'https://images.unsplash.com/photo-1518622116087-0b533e498c3f?w=800&auto=format&fit=crop&q=80',
    '2025-05-15T11:30:00Z',
    'The Senate passed a bipartisan infrastructure measure focused on transportation, broadband, and clean water projects across the United States.',
    array['Politics', 'Business'],
    'United States',
    '2025-05-15T11:32:00Z',
    null
  ),
  (
    '00000000-0000-4000-8000-000000000206',
    '00000000-0000-4000-8000-000000000106',
    'https://articles.example.invalid/arctic-ice-melt-study',
    'https://articles.example.invalid/arctic-ice-melt-study',
    'New study shows accelerating Arctic ice melt',
    'Researchers warn that current melt rates could exceed previous worst-case scenarios.',
    'https://images.unsplash.com/photo-1520638062828-091f09e38d7a?w=800&auto=format&fit=crop&q=80',
    '2025-05-15T11:00:00Z',
    'Researchers reported that current Arctic ice melt rates could exceed scenarios used in earlier projections.',
    array['Science', 'Environment'],
    'Arctic',
    '2025-05-15T11:02:00Z',
    null
  )
on conflict do nothing;

insert into public.article_analyses (
  id, article_id, summary, sentiment_score, sentiment_label, bias_score,
  bias_label, left_percentage, center_percentage, right_percentage,
  confidence, framing_notes, loaded_terms, disclaimer, model
)
values
  (
    '00000000-0000-4000-8000-000000000301',
    '00000000-0000-4000-8000-000000000201',
    'Artemis II launched from Kennedy Space Center for a ten-day crewed test flight around the Moon, validating systems for later lunar missions.',
    0.600,
    'positive',
    0.000,
    'center',
    18,
    64,
    18,
    0.860,
    array['The report emphasizes mission milestones and technical objectives.', 'Claims are attributed to NASA and presented with limited political framing.'],
    array['critical step forward', 'next giant leap'],
    'Political framing is AI-estimated from the article text and should not be treated as objective fact.',
    'demo-analysis-v1'
  ),
  (
    '00000000-0000-4000-8000-000000000302',
    '00000000-0000-4000-8000-000000000202',
    'Major US stock indexes rose after inflation data came in below expectations and corporate earnings remained strong.',
    0.500,
    'positive',
    -0.400,
    'left',
    55,
    30,
    15,
    0.780,
    array['The article emphasizes consumer cost relief and the policy implications of lower inflation.', 'Market gains receive more attention than risks or dissenting forecasts.'],
    array['broad rally', 'positive quarterly earnings'],
    'Political framing is AI-estimated from the article text and should not be treated as objective fact.',
    'demo-analysis-v1'
  )
on conflict do nothing;

insert into public.logs (id, level, event, message, metadata, article_id, created_at)
values
  (
    '00000000-0000-4000-8000-000000000401',
    'success',
    'analysis.completed',
    'Article analysis completed',
    '{"article_title":"NASA successfully launches Artemis II mission to the Moon","demo":true}'::jsonb,
    '00000000-0000-4000-8000-000000000201',
    '2025-05-15T13:20:00Z'
  ),
  (
    '00000000-0000-4000-8000-000000000402',
    'info',
    'articles.seeded',
    'Demo articles loaded into Supabase',
    '{"article_count":6,"demo":true}'::jsonb,
    null,
    '2025-05-15T13:18:00Z'
  ),
  (
    '00000000-0000-4000-8000-000000000403',
    'success',
    'analysis.completed',
    'Article analysis completed',
    '{"article_title":"Markets rally as inflation data shows continued cooling","demo":true}'::jsonb,
    '00000000-0000-4000-8000-000000000202',
    '2025-05-15T13:05:00Z'
  )
on conflict do nothing;
