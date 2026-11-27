export const mosquitoWorkshop = {
	slug: 'sf.gov/mosquito-education-workshop',
	type: 'Campaign',
	title: 'Free mosquito education workshop',
	reading: 'Grade 7',
	editorNote:
		'Campaign page mock. Maps conceptually to Karl\'s "Campaign" content type (see docs/wagtail-content-mapping.md). Spotlight, Additional-content Accordion sections, and Top facts now render as their own real-Karl-matching components (verified live against sf.gov/shop-dine-sf and sf.gov/1865-til-infinity) — remaining Campaign page-level fields with no mockup equivalent: Primary agency, Logo, Background header image, Color theme (no source image assets exist for this illustrative program). Workshop form: the CTA links OUT to a Fillout form, matching how SF.gov form pages behave — the page describes the service and hands off to the real form rather than embedding one. The URL is a REPLACE-ME sentinel: no Fillout form exists for this workshop yet. The embedded mock at forms/mosquito-workshop-request/ is retained as a design reference for what that form should capture, but nothing links to it and it has no intake backend. SME placeholder — production form URL, intake backend, capacity, service area, lead time, and standards crosswalk below are illustrative example content for mockup review; confirm actual values with HHVC before publication. In Karl Button: screenreader label “Go to mosquito workshop request form.”',
	editorStatus: 'placeholder',
	sections: [
		{
			heading: 'Bring mosquito science to your students',
			image: {
				src: '/images/mockup/culex-mosquito-magnified.webp',
				alt: 'A Culex mosquito’s head under magnification, with its large green compound eye and long antennae.',
				width: 1390,
				height: 1043,
				credit: {
					title: 'Culex',
					creator: 'Alex Wild, Insects Unlocked, University of Texas at Austin',
					sourceUrl: 'https://commons.wikimedia.org/wiki/File:Culex_(25414001085).jpg',
					license: 'CC0 (public domain)'
				}
			},
			karl: 'Maps to Spotlight 1: Spotlight title = this heading, Spotlight description = the paragraphs below. Spotlight image = the magnified mosquito, which is what students see at the workshop\'s microscope stations — it carries the page\'s point rather than decorating it. Upload the 1390×1043 file (Spotlight needs 1080×350px+, 4:3 recommended; this is 4:3) with Image alignment "Full width", which puts the text under the image as the mockup shows. The source photo had a caption band printed along its bottom; that band is cropped off, because text in an image is not allowed on SF.gov. CC0, so no attribution is required. Spotlight 2 ("Request a workshop") still needs its own image — flag for Digital Services. No button set here; the workshop CTA lives in Spotlight 2 ("Request a workshop" section below) instead. Renders as a light-blue Spotlight box, confirmed live against sf.gov/shop-dine-sf and sf.gov/1865-til-infinity.',
			kind: 'body',
			component: 'spotlight',
			paragraphs: [
				'Healthy Housing and Vector Control (HHVC) offers a free mosquito education workshop for youth audiences in San Francisco.',
				'Our team sets up science stations where students look at mosquitoes up close, find out where they breed, and learn how avoiding bites helps prevent disease.'
			],
			callout: {
				karl: 'Spotlight has no callout field — fold this "free program" note into the Spotlight description as a bolded lead-in, or flag for Digital Services if a distinct callout is needed.',
				text: 'This is a free City service for eligible schools, summer camps, museums, and science fairs within San Francisco.'
			}
		},
		{
			heading: 'Who can request a workshop',
			karl: "Maps to an Additional content → Accordion section block: Title = this heading, Accordion sidebar (rich text) = the paragraph below, and each bullet below becomes one Accordion item (Title = audience type, Body = elaboration — this mockup's bullets are single-line, so item bodies would need light rewriting to fit the Title+Body shape). Renders as a collapsible accordion, reusing the same component Transaction's Supporting information already uses.",
			kind: 'body',
			component: 'supporting',
			bullets: [
				'Public and private schools',
				'Summer camps and after-school programs',
				'Museums and library science programs',
				'Science fairs and youth STEM events'
			],
			paragraphs: [
				'Workshops are for elementary and middle school students. [Healthy Housing and Vector Control](pestsTopic) can help you choose the right station setup for your group size and space.'
			]
		},
		{
			heading: 'What students experience',
			karl: 'Maps to a second Additional content → Accordion section block: Title = this heading, Accordion sidebar = the paragraph below, each bullet below becomes one Accordion item (station name as Title, elaboration as Body). Renders as a collapsible accordion.',
			kind: 'body',
			component: 'supporting',
			paragraphs: [
				'Each workshop uses mobile science stations. Students observe mosquitoes up close and learn how small changes at home can prevent breeding.'
			],
			bullets: [
				'Microscopes to view mosquito specimens and larvae',
				'Live mosquito larvae demonstrations in safe, contained displays',
				'Hands-on activities about standing water, life cycles, and bite prevention',
				'Educational handouts and discussion prompts for teachers and group leaders',
				'Connections to local West Nile virus surveillance and community reporting'
			]
		},
		{
			heading: 'Aligned with California education standards',
			karl: 'Maps to a third Additional content → Accordion section block: Title = this heading, Accordion sidebar = the two paragraphs below, each bullet becomes one Accordion item. Renders as a collapsible accordion.',
			kind: 'body',
			component: 'supporting',
			paragraphs: [
				'The activities support California’s science standards for life science and public health.',
				'At each station, students make observations, use them as evidence, and explain how mosquitoes depend on their surroundings.'
			],
			bullets: [
				'Life cycles and habitats of mosquitoes',
				'How environmental conditions affect public health',
				'Using tools such as microscopes to collect and interpret observations',
				'Using what they learn to stop mosquitoes breeding at home'
			],
			callout: {
				karl: 'No callout field on Accordion section or its items — fold this "standards summary available on request" note into the sidebar text or the last Accordion item\'s Body, or flag for Digital Services. Verify the final standards crosswalk with HHVC before publication (moved here from the callout text, 2026-11-26: it is an instruction to editors, not copy for teachers).',
				text: 'Teachers can ask HHVC for a summary of which standards the workshop covers.'
			}
		},
		{
			heading: 'Request a workshop',
			karl: 'Maps to Spotlight 2: Spotlight title = this heading, Spotlight description = the paragraphs below, and "Request a workshop online" becomes Spotlight 2\'s nested Button link (Link text = button label, target = buttonUrl). Spotlight also needs a Spotlight image with no mockup equivalent — flag for Digital Services. The button leaves SF.gov for a Fillout form, which is how SF.gov form pages work — the page describes the service and links out to the real form rather than embedding one (confirmed live: sf.gov/pay-your-annual-healthy-housing-fee-apartment-buildings links "Pay online" out to services.paysf.co). SME placeholder: the Fillout form does not exist yet and the URL below is a deliberate REPLACE-ME sentinel, not a live link; HHVC must create the form and supply the production URL before publication (sectionSchema has no top-level unverified flag, so this caveat lives here and on the paragraph rather than on the button itself).',
			kind: 'body',
			component: 'spotlight',
			paragraphs: [
				{
					text: 'Use the online request form to tell us about your organization, audience, dates, and event space. HHVC will follow up about availability.',
					unverified: true,
					unverifiedReason:
						'SME placeholder — the request form is illustrative example content for mockup review. No Fillout form has been built for this workshop yet, so the button below points at a REPLACE-ME sentinel URL rather than a live form. Confirm the production Fillout URL, the intake backend, and who receives submissions with HHVC before publication.'
				},
				'You can also contact the Mosquito Control Program directly if you have questions before submitting the form.'
			],
			button: 'Request a workshop online',
			buttonUrl: 'https://forms.fillout.com/t/REPLACE-WITH-REAL-FORM-ID'
		},
		{
			heading: 'Questions before you apply',
			karl: 'Maps to Top facts: Facts title = this heading, and each fact below is one Fact item (Fact title = the short label, Fact text = the full detail). The phone number could alternatively live in the dedicated Contact us panel\'s Phone block (Owner = "Mosquito Control Program", Phone number = the confirmed program line) instead — Top facts is the closer fit for the other three logistics facts, so Contact us isn\'t used here to avoid splitting this content across two panels. FLAG: the 415-252-3806 number shown below is unverified (no tier-1/2/3 source; tier-1 cites 415-252-3800) — confirm with HHVC before entering it in any Karl phone field. Renders as a boxed Top facts panel.',
			kind: 'body',
			component: 'top-facts',
			paragraphs: [
				'Call or email the Mosquito Control Program if you need help deciding whether the workshop is right for your group.'
			],
			facts: [
				{
					label: 'Contact',
					text: 'Contact the Mosquito Control Program at 415-252-3806',
					unverified: true,
					unverifiedReason:
						'Phone number 415-252-3806 appears in no tier-1/2/3 source doc (source-of-truth audit 2026-07-06, cross-cutting finding #2). The tier-1-confirmed DPH number is 415-252-3800 — this reads as a digit swap. Confirm the real program line with HHVC before publication.'
				},
				{
					label: 'Service area',
					text: 'Available to schools, camps, museums, and youth groups located within San Francisco'
				},
				{
					label: 'Group size',
					text: 'Fits groups up to about 60 students per session; larger groups can be split into multiple sessions',
					unverified: true,
					unverifiedReason:
						'SME placeholder — capacity is illustrative example content for mockup review; confirm actual value with HHVC before publication (see page editorNote).'
				},
				{
					label: 'Lead time',
					text: 'Request at least 3 weeks before your event date to allow time for scheduling, setup, and equipment transport',
					unverified: true,
					unverifiedReason:
						'SME placeholder — lead time is illustrative example content for mockup review; confirm actual value with HHVC before publication (see page editorNote).'
				}
			]
		},
		{
			heading: 'Related pages',
			karl: "Maps to Campaign's Related field (raw name `related_links`, a repeatable StreamField — confirmed via live admin, 2026-07-06; each entry is a Page block: Link to radio SF.gov page/External URL/None, Page chooser, Link text). Corrected from an earlier assumption that this field was single-item — it isn't. All 3 cards below can map directly to separate related_links entries (Link to = SF.gov page, Page = target, Link text = title). The Healthy Housing and Vector Control card that ended this list is now an Internal link in the “Who can request” accordion sidebar (2026-11-26): the Help Center's Related page lists only Transaction, Information, Campaign and Topic pages, and whether that rule binds a Campaign's `related_links` is unconfirmed, so the link moved rather than wait on it.",
			kind: 'placement',
			cards: [
				{
					title: 'Mosquito Control Program',
					target: 'mosquitoControl',
					karl: 'Maps to a related_links entry (Link to = SF.gov page, Page = this target, Link text = this title).'
				},
				{
					title: 'CDC: Preventing mosquito bites',
					url: 'https://www.cdc.gov/mosquitoes/prevention/index.html',
					karl: 'Maps to a related_links entry (Link to = External URL, Link text = this title). Third-party CDC reference replaces the retired City prevention page (manager directive: do not reinvent the wheel).'
				},
				{
					title: 'Report a dead bird to the State',
					url: 'https://westnile.ca.gov/report',
					karl: 'Maps to a related_links entry (Link to = External URL, Link text = this title). Replaces the retired City dead-bird transaction page — the State runs this reporting line.'
				}
			]
		}
	],
	seoTitle: 'Free mosquito education workshop | SF.gov',
	metaDescription:
		'Request a free HHVC mosquito science workshop with microscopes and live larvae for San Francisco schools.'
};
