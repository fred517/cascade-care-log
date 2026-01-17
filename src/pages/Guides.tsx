import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { GuideCard, GuideContent } from '@/components/guides/GuideCard';
import { ArrowLeft, Search } from 'lucide-react';

interface Guide {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  content: {
    sections: { heading: string; content: string[] }[];
    tips?: string[];
    warnings?: string[];
  };
}

const guides: Guide[] = [
  {
    id: 'svi-test',
    title: 'SVI / SV30 Test Procedure',
    description: 'Complete guide to performing the Sludge Volume Index test including calculation methods',
    icon: '🧪',
    category: 'Testing',
    content: {
      sections: [
        {
          heading: 'Collect the Sample',
          content: [
            'Use a clean 1-liter graduated cylinder. Ensure it is properly marked and readable.',
            'Collect a well-mixed sample from the aeration basin mixed liquor.',
            'Fill the cylinder to exactly 1000 mL (or 1 liter mark).',
          ],
        },
        {
          heading: 'Allow to Settle',
          content: [
            'Place the cylinder on a flat, stable surface away from vibrations.',
            'Start a timer for exactly 30 minutes.',
            'Do not disturb the cylinder during the settling period.',
            'The test is temperature-sensitive; note ambient conditions.',
          ],
        },
        {
          heading: 'Read the Settled Volume',
          content: [
            'After 30 minutes, read the volume of settled sludge (SV30) at the interface.',
            'Record the value in mL. This is your SV30 reading.',
            'If sludge settles past 500 mL, consider diluting and re-running for accuracy.',
          ],
        },
        {
          heading: 'Calculate SVI',
          content: [
            'Formula: SVI (mL/g) = (SV30 × 1000) ÷ MLSS (mg/L)',
            'Example: If SV30 = 250 mL and MLSS = 2500 mg/L',
            'SVI = (250 × 1000) ÷ 2500 = 100 mL/g',
            'Record the SVI value in the app.',
          ],
        },
      ],
      tips: [
        'Typical healthy SVI range is 50-150 mL/g',
        'SVI > 150 may indicate filamentous bulking',
        'SVI < 50 may indicate pin floc or old sludge',
        'Compare with historical trends for context',
      ],
      warnings: [
        'Wear appropriate PPE when handling mixed liquor samples',
        'Dispose of samples properly after testing',
        'Clean cylinders thoroughly between tests',
      ],
    },
  },
  {
    id: 'ph-probe',
    title: 'pH Probe Care & Calibration',
    description: 'Maintenance and calibration procedures for pH measurement equipment',
    icon: '⚗️',
    category: 'Equipment',
    content: {
      sections: [
        {
          heading: 'Daily Inspection',
          content: [
            'Check probe for physical damage, cracks, or contamination.',
            'Ensure the reference junction is not clogged.',
            'Verify the probe is stored in proper storage solution (not distilled water).',
          ],
        },
        {
          heading: 'Calibration (Two-Point)',
          content: [
            'Rinse probe with distilled water and blot dry.',
            'Place in pH 7.00 buffer, allow to stabilize, and set the zero point.',
            'Rinse again and place in pH 4.00 or 10.00 buffer (depending on expected range).',
            'Set the slope point once stabilized.',
            'Rinse and return to process or storage solution.',
          ],
        },
        {
          heading: 'Troubleshooting Slow Response',
          content: [
            'Soak probe in warm (not hot) pH 7 buffer for 15-30 minutes.',
            'If still slow, try soaking in 0.1M HCl for 10 minutes, then rinse.',
            'Replace reference solution if probe has a refillable junction.',
            'Consider replacement if response time remains poor.',
          ],
        },
      ],
      tips: [
        'Calibrate at least weekly, or more often if readings seem off',
        'Buffer solutions expire – check dates',
        'Store probe in pH 4 storage solution, never distilled water',
      ],
      warnings: [
        'Do not touch the glass bulb with bare hands',
        'Handle acids and bases with appropriate PPE',
      ],
    },
  },
  {
    id: 'do-probe',
    title: 'DO Probe Maintenance',
    description: 'Dissolved oxygen sensor care, membrane replacement, and calibration',
    icon: '💨',
    category: 'Equipment',
    content: {
      sections: [
        {
          heading: 'Visual Inspection',
          content: [
            'Check membrane for bubbles, wrinkles, or fouling.',
            'Inspect O-rings for wear or damage.',
            'Clean any debris from the sensor tip.',
          ],
        },
        {
          heading: 'Membrane Replacement',
          content: [
            'Remove old membrane and O-ring.',
            'Fill the sensor cap with fresh electrolyte solution (fill to avoid bubbles).',
            'Carefully install a new membrane without trapping air.',
            'Replace O-ring and secure the cap.',
            'Allow 24 hours for polarization before calibrating.',
          ],
        },
        {
          heading: 'Calibration',
          content: [
            'Zero-point: Use zero-oxygen solution (optional, depends on meter).',
            'Air saturation: Place probe in moist air (not submerged) and calibrate to 100%.',
            'Some meters auto-calculate based on barometric pressure and temperature.',
          ],
        },
      ],
      tips: [
        'Membrane life is typically 2-4 weeks depending on conditions',
        'Keep spare membrane kits on hand',
        'Always allow polarization time after membrane change',
      ],
      warnings: [
        'Electrolyte solutions may be caustic – handle with care',
        'Never let the membrane dry out during operation',
      ],
    },
  },
  {
    id: 'orp-basics',
    title: 'ORP Interpretation Guide',
    description: 'Understanding oxidation-reduction potential readings and what they mean',
    icon: '⚡',
    category: 'Analysis',
    content: {
      sections: [
        {
          heading: 'What is ORP?',
          content: [
            'ORP (Oxidation-Reduction Potential) measures the tendency of a solution to gain or lose electrons.',
            'Measured in millivolts (mV) relative to a reference electrode.',
            'Higher (positive) values = more oxidizing; Lower (negative) values = more reducing.',
          ],
        },
        {
          heading: 'Typical Ranges',
          content: [
            'Aerobic conditions: Generally +100 to +300 mV or higher',
            'Anoxic conditions: Generally +50 to -50 mV',
            'Anaerobic/septic conditions: Generally below -100 mV',
            'Note: These are guidelines; actual values depend on many factors.',
          ],
        },
        {
          heading: 'Using ORP for Process Control',
          content: [
            'ORP can indicate the status of nitrification/denitrification.',
            'Sudden drops may indicate organic loading or aeration problems.',
            'Use in conjunction with DO and pH for a complete picture.',
          ],
        },
      ],
      tips: [
        'ORP is best used for trend analysis, not absolute values',
        'Clean probes regularly – fouling affects readings significantly',
        'Compare with DO readings for consistency checks',
      ],
    },
  },
  {
    id: 'mlss-sampling',
    title: 'MLSS Sampling & Analysis',
    description: 'Proper techniques for mixed liquor suspended solids testing',
    icon: '🔬',
    category: 'Testing',
    content: {
      sections: [
        {
          heading: 'Sample Collection',
          content: [
            'Collect from a well-mixed location in the aeration basin.',
            'Use a clean sample container – plastic or glass is acceptable.',
            'Collect a representative sample (not from surface or walls).',
          ],
        },
        {
          heading: 'Laboratory Method (Standard)',
          content: [
            'Filter a known volume through a pre-weighed glass fiber filter.',
            'Dry at 103-105°C for at least 1 hour.',
            'Cool in desiccator and weigh.',
            'MLSS (mg/L) = [(Final weight - Initial weight) × 1,000,000] ÷ Sample volume (mL)',
          ],
        },
        {
          heading: 'Quick Estimation',
          content: [
            'Use a portable TSS meter if available (follow manufacturer instructions).',
            'Compare with lab results periodically for calibration verification.',
          ],
        },
      ],
      tips: [
        'Run duplicate samples for QA/QC',
        'Standard MLSS for activated sludge is typically 2000-4000 mg/L',
        'Track MLSS daily to manage sludge age',
      ],
    },
  },
  {
    id: 'ammonia-testing',
    title: 'Ammonia Testing Methods',
    description: 'Field and lab methods for ammonia nitrogen measurement',
    icon: '🧫',
    category: 'Testing',
    content: {
      sections: [
        {
          heading: 'Understanding Ammonia Forms',
          content: [
            'NH₃-N (ammonia nitrogen) and NH₄-N (ammonium nitrogen) are often reported.',
            'At typical wastewater pH, most is in the ammonium (NH₄⁺) form.',
            'Ensure you know which form your lab or meter reports.',
          ],
        },
        {
          heading: 'Field Meter Method',
          content: [
            'Calibrate the meter per manufacturer instructions.',
            'Collect a fresh sample and measure immediately (ammonia volatilizes).',
            'Record the value with units and test method.',
          ],
        },
        {
          heading: 'Lab Method (Ion Selective Electrode)',
          content: [
            'Adjust sample pH to >11 with NaOH to convert NH₄⁺ to NH₃.',
            'Use ISE probe calibrated with known standards.',
            'Read and record ammonia-N concentration.',
          ],
        },
      ],
      tips: [
        'Test samples immediately – ammonia can off-gas quickly',
        'High ammonia often indicates nitrification problems',
        'Cross-reference with DO and pH for troubleshooting',
      ],
      warnings: [
        'NaOH for pH adjustment is caustic – use PPE',
        'Ammonia standards should be stored properly and checked for expiration',
      ],
    },
  },
  {
    id: 'mlss-playbook',
    title: 'MLSS Wasting Control Playbook',
    description: 'Complete operational guide for MLSS-based sludge wasting, calibration schedules, and sampling timing',
    icon: '📋',
    category: 'Operations',
    content: {
      sections: [
        {
          heading: 'MLSS Target Ranges & Wasting Logic',
          content: [
            'Compare daily MLSS readings against your site-specific setpoint (typically 2000-4000 mg/L).',
            'Use a 7-day rolling average to smooth out daily variations and lab error (±15%).',
            'IF MLSS < Target: STOP or REDUCE wasting to allow biomass to accumulate.',
            'IF MLSS > Target: INCREASE wasting rate to reduce biomass inventory.',
            'Calculate pounds to waste: Lbs/day = (Current MLSS × Volume) ÷ (Target SRT × 8.34)',
          ],
        },
        {
          heading: 'Daily Sampling – Same Time Every Day',
          content: [
            'CRITICAL: Take MLSS samples at the SAME TIME each day (recommended: 7:00-10:00 AM).',
            'Why? MLSS can fluctuate >30% within a single hour due to diurnal flow patterns.',
            'Consistent timing ensures data points are comparable for SRT/MCRT calculations.',
            'Morning samples typically catch the system at a more stable state before peak loading.',
            'Document your standard sampling time and stick to it (±30 minutes max deviation).',
          ],
        },
        {
          heading: 'Wasting Decision Matrix',
          content: [
            '7-Day Avg MLSS < 90% of Target → STOP wasting for 24 hours, reassess.',
            '7-Day Avg MLSS 90-95% of Target → REDUCE wasting by 25%.',
            '7-Day Avg MLSS 95-105% of Target → MAINTAIN current wasting rate.',
            '7-Day Avg MLSS 105-110% of Target → INCREASE wasting by 25%.',
            '7-Day Avg MLSS > 110% of Target → INCREASE wasting by 50%, check clarifier blanket.',
          ],
        },
        {
          heading: 'Meter Calibration Schedule (Every 7 Days)',
          content: [
            'Calibrate TSS/MLSS sensors every 7 days at approximately the same time.',
            'Best practice: Schedule calibration for the same day and time each week (e.g., Monday 8:00 AM).',
            'Collect a grab sample simultaneously with the sensor reading for comparison.',
            'If sensor deviates >10% from grab sample result, recalibrate immediately.',
            'Document all calibrations: date, time, grab sample value, sensor value, adjustment made.',
          ],
        },
        {
          heading: 'Calibration Procedure',
          content: [
            'Step 1: Clean the sensor thoroughly before calibration.',
            'Step 2: Take a grab sample from the same location as the sensor.',
            'Step 3: Record the sensor reading at the exact time of grab sample collection.',
            'Step 4: Analyze grab sample in the lab using standard methods.',
            'Step 5: Compare results and adjust sensor calibration if >10% deviation.',
            'Step 6: Re-verify with another grab sample after calibration adjustment.',
          ],
        },
        {
          heading: 'SRT/MCRT Control Integration',
          content: [
            'Target SRT (Sludge Retention Time) is typically 5-15 days depending on treatment goals.',
            'Shorter SRT (5-8 days): Higher F:M ratio, good for BOD removal only.',
            'Longer SRT (10-15 days): Lower F:M ratio, required for nitrification.',
            'SRT = (MLSS × Aeration Volume) ÷ (Daily Lbs Wasted + Lbs Lost in Effluent)',
            'Use the 7-day averaged MLSS for SRT calculations to reduce noise.',
          ],
        },
        {
          heading: 'Troubleshooting Common Issues',
          content: [
            'MLSS won\'t increase despite stopping wasting: Check for sludge loss in clarifier, RAS rate, or septicity.',
            'MLSS dropping rapidly: Check for toxic shock, pH upset, or excessive wasting.',
            'Sensor readings inconsistent: Increase calibration frequency, check for fouling.',
            'SVI increasing while MLSS normal: Possible filamentous bulking – increase wasting temporarily.',
          ],
        },
      ],
      tips: [
        'Always use 7-day rolling averages for wasting decisions, not single grab samples',
        'Set calendar reminders for weekly calibrations at the same day/time',
        'Morning sampling (7-10 AM) typically provides most stable readings',
        'Keep calibration logs alongside MLSS data for trend analysis',
        'Cross-reference MLSS with SVI – both should move together for healthy sludge',
        'Consider online sensors for continuous monitoring if manual sampling is inconsistent',
      ],
      warnings: [
        'Never make wasting changes based on a single MLSS reading – use the 7-day average',
        'Sudden wasting rate changes can shock the biology – adjust gradually (25% increments)',
        'If MLSS drops below 1500 mg/L, stop all wasting immediately and investigate',
        'Calibration skipped for >14 days can lead to significant process control errors',
      ],
    },
  },
];

export default function Guides() {
  const [selectedGuide, setSelectedGuide] = useState<Guide | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredGuides = guides.filter(
    (g) =>
      g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (selectedGuide) {
    return (
      <AppLayout>
        <div className="max-w-3xl mx-auto">
          <button
            onClick={() => setSelectedGuide(null)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Guides
          </button>
          <div className="bg-card rounded-xl border border-border p-6">
            <GuideContent
              title={selectedGuide.title}
              sections={selectedGuide.content.sections}
              tips={selectedGuide.content.tips}
              warnings={selectedGuide.content.warnings}
            />
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">How-To Guides</h1>
          <p className="text-muted-foreground">
            Standard operating procedures, testing methods, and equipment care
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search guides..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-12"
          />
        </div>

        {/* Categories */}
        <div className="space-y-6">
          {['Operations', 'Testing', 'Equipment', 'Analysis'].map((category) => {
            const categoryGuides = filteredGuides.filter((g) => g.category === category);
            if (categoryGuides.length === 0) return null;

            return (
              <div key={category}>
                <h2 className="text-lg font-semibold text-foreground mb-3">{category}</h2>
                <div className="space-y-3">
                  {categoryGuides.map((guide) => (
                    <GuideCard
                      key={guide.id}
                      title={guide.title}
                      description={guide.description}
                      icon={guide.icon}
                      category={guide.category}
                      onClick={() => setSelectedGuide(guide)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {filteredGuides.length === 0 && (
          <div className="text-center py-12 bg-card rounded-xl border border-border">
            <Search className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">No guides found</h2>
            <p className="text-muted-foreground">
              Try adjusting your search query
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
