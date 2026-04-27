import { useEffect } from 'react';

interface ExamplePrompt {
  theme: string;
  prompt: string;
  description: string;
}

const EXAMPLE_PROMPTS: ExamplePrompt[] = [
  {
    theme: 'Nature & Landscapes',
    prompt: 'A mist‑filled ancient redwood forest at sunrise, shafts of golden light filtering through massive trunks, hyper‑realistic, 8K, cinematic depth of field',
    description: 'Dramatic time‑of‑day cue with a specific tree species for strong visual anchors.',
  },
  {
    theme: 'Nature & Landscapes',
    prompt: 'Floating islands over a turquoise lagoon, pastel‑colored clouds, Art Nouveau detail, soft pastel palette, ultra‑wide angle',
    description: 'Fantasy element balanced by a clear color guide and a known artistic style.',
  },
  {
    theme: 'Nature & Landscapes',
    prompt: 'A close‑up macro shot of a dew‑covered spiderweb on a rose petal, vibrant emerald greens and ruby reds, shallow focus, photorealistic',
    description: 'Macro subjects force fine detail, while color cues avoid generic outputs.',
  },
  {
    theme: 'Nature & Landscapes',
    prompt: 'Aurora borealis over a snowy mountain range, reflected in a crystal‑clear lake, night sky, star‑filled, ultra‑realistic, high contrast',
    description: 'The reflection doubles visual interest and gives the model clear symmetry.',
  },
  {
    theme: 'Sci‑Fi & Futurism',
    prompt: 'A neon‑lit cyberpunk megacity at night, towering holographic billboards, rain‑slick streets, viewed from a rooftop, Blade Runner aesthetic, ultra‑detailed',
    description: 'Lighting (neon, rain) and perspective (rooftop) avoid flat cityscapes.',
  },
  {
    theme: 'Sci‑Fi & Futurism',
    prompt: 'A sleek single‑seat starfighter emerging from a wormhole, glowing plasma trails, hyper‑realistic, cinematic lighting, 16k, concept art',
    description: 'Dynamic motion cue ("emerging") plus specific tech vocabulary (plasma trails).',
  },
  {
    theme: 'Sci‑Fi & Futurism',
    prompt: 'A massive orbital colony with rotating habitats, earthy terraformed domes, sunrise over Europa‑like ice, soft pastel colors, concept illustration',
    description: 'Planetary backdrop with human architecture for a balanced composition.',
  },
  {
    theme: 'Sci‑Fi & Futurism',
    prompt: 'A humanoid AI librarian in a massive glass library, floating holographic books, soft ambient lighting, ultra‑realistic portrait',
    description: 'Personifies AI with a clear setting (library) and lighting style.',
  },
  {
    theme: 'Historical & Fantasy',
    prompt: 'A Viking longship sailing through a stormy fjord, dramatic clouds, chiaroscuro lighting, oil painting style, 4k',
    description: 'Era‑specific vessel with atmospheric weather gives the model a strong mood.',
  },
  {
    theme: 'Historical & Fantasy',
    prompt: "A medieval alchemist's workshop, cluttered shelves of potions, brass alembics, warm candlelight, hyper‑realistic, cinematic composition",
    description: 'Detailed prop list plus lighting cues guide away from generic interiors.',
  },
  {
    theme: 'Historical & Fantasy',
    prompt: 'A dragon perched atop an ancient stone cathedral, sunrise, baroque architecture, vivid orange‑purple sky, fantasy illustration',
    description: 'Mythical creature with recognizable architecture for striking visual tension.',
  },
  {
    theme: 'Historical & Fantasy',
    prompt: 'A samurai silhouetted against a moonlit cherry‑blossom garden, traditional kimono, ukiyo‑e style, high‑contrast, ink wash',
    description: 'Cultural reference and art style produce a clean, recognizable result.',
  },
  {
    theme: 'Portraits & People',
    prompt: 'Portrait of a 1920s flapper girl with a feather headband, side lighting, soft pastel colors, film grain, vintage photography style',
    description: 'Era, fashion accessory, and lighting direction for a crisp focal point.',
  },
  {
    theme: 'Portraits & People',
    prompt: 'Close‑up of an elderly hand planting a seedling, weathered skin, bright green sprout, shallow depth of field, hyper‑realistic, cinematic',
    description: 'Emotion‑driven action (planting) combined with tangible details (weathered skin).',
  },
  {
    theme: 'Portraits & People',
    prompt: 'A futuristic fashion model wearing translucent holographic garments, neon runway, high‑contrast, studio lighting, editorial style',
    description: 'Merges fashion with sci‑fi, giving clear cues for texture (translucent).',
  },
  {
    theme: 'Portraits & People',
    prompt: 'A child reading a floating book in a whimsical forest, soft golden hour lighting, storybook illustration, gentle pastel palette',
    description: 'Child + magic is instantly appealing; lighting and palette keep it tender.',
  },
  {
    theme: 'Concept & Abstract',
    prompt: 'Data streams visualized as glowing rivers flowing through a neon city, isometric view, cyberpunk aesthetic, high detail, 8k',
    description: 'Turns an abstract idea (data) into a concrete metaphor (rivers).',
  },
  {
    theme: 'Concept & Abstract',
    prompt: 'Emotion of joy rendered as exploding fireworks of color, abstract expressionist painting, bold brushstrokes, vivid primary colors',
    description: 'Gives the model a tangible visual language (fireworks, brushstrokes).',
  },
  {
    theme: 'Concept & Abstract',
    prompt: 'A surreal collage of floating clocks melting over a desert, Salvador Dalí style, hyper‑realistic textures, dreamlike lighting',
    description: 'Classic surreal reference + explicit object list.',
  },
  {
    theme: 'Concept & Abstract',
    prompt: 'The concept of time depicted as a spiraling galaxy of hourglasses, soft focus, ethereal pastel glow, concept art',
    description: 'Mixes macro (galaxy) and micro (hourglasses) for eye‑catching composition.',
  },
  {
    theme: 'Found on the Web',
    prompt: 'A cybernetic hummingbird with iridescent metallic feathers hovering over a neon lotus pond, rain‑slick surface, ultra‑realistic, 4K, cinematic lighting, soft focus background',
    description: 'From the AI Art Prompt Library (CC‑0); can be used verbatim or adapted.',
  },
  {
    theme: 'Modern City & Office',
    prompt: 'Trading floor on a busy day, ultra‑realistic, high contrast, glossy monitor reflections, motion blur of traders\' hands, 35mm lens, shallow depth of field, 8K',
    description: 'Fast movement and reflective surfaces force the model to render realistic light spill and depth.',
  },
  {
    theme: 'Modern City & Office',
    prompt: 'Open‑plan tech startup office at golden hour, large glass walls overlooking a skyline, warm ambient lighting, people collaborating over standing desks, photorealistic, 4K, wide‑angle view',
    description: 'Natural light with interior details (standing desks, people) for a lively yet balanced composition.',
  },
  {
    theme: 'Modern City & Office',
    prompt: 'Rooftop co‑working space at night, neon signage, cityscape backdrop, string lights casting soft bokeh, people with laptops, cinematic lighting, ultra‑realistic, 6K, portrait orientation',
    description: 'Night‑time urban vibe with contrasting artificial lights; bokeh defines background vs. foreground.',
  },
  {
    theme: 'Modern City & Office',
    prompt: 'High‑rise executive boardroom with floor‑to‑ceiling windows, sunrise over the city, polished mahogany table, empty chairs, dramatic rim lighting, hyper‑realistic, 8K, low angle',
    description: 'Architectural geometry and the interplay of sunrise light with interior surfaces.',
  },
  {
    theme: 'Modern City & Office',
    prompt: 'Underground subway station during rush hour, streaks of light from passing trains, wet tiles reflecting crowds, gritty realism, 24mm lens, high contrast, 8K',
    description: 'Dynamic motion cues (streaks of light) and texture details (wet tiles) drive a cinematic urban scene.',
  },
  {
    theme: 'Construction Sites',
    prompt: 'Large urban construction site at dusk, towering crane against a pink‑orange sky, workers in safety vests, concrete piles, soft shadows, ultra‑realistic, 8K, wide‑angle',
    description: 'Distinct construction elements (crane, concrete piles) with dramatic lighting to create depth.',
  },
  {
    theme: 'Construction Sites',
    prompt: 'Night‑time high‑rise building under construction, floodlights illuminating steel framework, half‑finished façade, dramatic shadows, photorealistic, 4K, low angle view',
    description: 'Night lighting highlights structural details and adds contrast for a striking silhouette.',
  },
  {
    theme: 'Construction Sites',
    prompt: 'Rural bridge project over a river, concrete arches mid‑assembly, morning mist, workers on scaffolding, soft diffused light, hyper‑realistic, 6K, aerial perspective',
    description: 'Aerial perspective and mist give atmospheric depth while the bridge provides clear focal geometry.',
  },
  {
    theme: 'Construction Sites',
    prompt: 'Interior of a modern office building under renovation, exposed ducts, glass partitions, dust particles in sunlight shafts, cinematic depth of field, 8K, 50mm lens',
    description: 'Contrast between raw construction and polished office design, with light shafts adding visual interest.',
  },
  {
    theme: 'Construction Sites',
    prompt: 'Concrete pour on a busy city street, massive mixer truck, workers directing flow, splashing wet concrete, high‑detail macro on droplets, ultra‑realistic, 4K, close‑up',
    description: 'Macro focus on concrete droplets forces the model to render fine textures and realistic water physics.',
  },
];

function groupByTheme(prompts: ExamplePrompt[]): Map<string, ExamplePrompt[]> {
  const groups = new Map<string, ExamplePrompt[]>();
  for (const p of prompts) {
    const existing = groups.get(p.theme) ?? [];
    existing.push(p);
    groups.set(p.theme, existing);
  }
  return groups;
}

interface ExamplePromptsModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (prompt: string) => void;
}

export function ExamplePromptsModal({ open, onClose, onSelect }: ExamplePromptsModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  const grouped = groupByTheme(EXAMPLE_PROMPTS);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
    >
      <div
        className="bg-background border border-border rounded-sm p-5 w-full max-w-3xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-semibold">Example Prompts</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-subtle hover:text-foreground text-lg leading-none"
          >
            &times;
          </button>
        </div>

        <div className="overflow-y-auto flex-1 space-y-5 pr-1">
          {[...grouped.entries()].map(([theme, prompts]) => (
            <div key={theme}>
              <h4 className="text-xs font-semibold text-subtle mb-2">{theme}</h4>
              <div className="grid grid-cols-2 gap-2">
                {prompts.map((example) => (
                  <button
                    key={example.prompt}
                    type="button"
                    onClick={() => {
                      onSelect(example.prompt);
                      onClose();
                    }}
                    className="border border-border rounded-sm p-3 text-left hover:bg-muted/40 transition-colors cursor-pointer"
                  >
                    <div className="text-xs leading-relaxed line-clamp-3">{example.prompt}</div>
                    <div className="text-xs text-subtle mt-1.5">{example.description}</div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
