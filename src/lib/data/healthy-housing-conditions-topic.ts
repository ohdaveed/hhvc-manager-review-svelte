export const healthyHousingTopic = {
	slug: 'sf.gov/topics--healthy-housing-conditions',
	type: 'Topic',
	title: 'Healthy housing conditions',
	summary:
		'Report pests, mold, or garbage, look up building records, and find help keeping your home safe.',
	audience: [
		'This page is for tenants, property owners and managers, and anyone researching healthy-housing services in San Francisco.'
	],
	reading: 'Grade 6',
	editorNote:
		"New Topic-type page mock, verified against the real, currently-live sf.gov/topics--healthy-housing-conditions — a Topic page that sits exactly where HHVC's own program belongs in SF.gov's real information architecture, one level above where this mockup's Agency page (pestsTopic) sits. Field mapping confirmed against docs/wagtail-content-mapping.md's \"Verified against the real Karl 'Topic' add-page form\" section (2026-07-05) plus this live re-check (2026-08-12). Every card below targets a page this mockup already has — no invented pages. The live page's own 'Lead poisoning issues'/asbestos content has no equivalent anywhere in this mockup and sits outside HHVC's established Article 11 scope (CLAUDE.md's banned-terms list), so it is not reproduced; the second Services sub-group below (\"Look up records\") substitutes this mockup's own records Resource Collection in its place. Mockup fields with no equivalent here, matching every other page type's own documented gaps: Primary agency, Set top-level?, Child topics, Timeline (no other Topic pages exist in this mockup to nest under or list as children). MERGED 2026-11-25 (Topic merge, Decided Nov 24, 2026): the Healthy housing and pest resources and Look up building records Resource Collections fold into this page and are retired. Every page and outside document they linked is listed here, under the Topic tab's suggested structure with the reports grouped as Pests and Sanitation; their intro paragraphs have no Topic field to go into. The Agency page card is dropped: the Topic tab notes an Agency page isn't a service. Live on sf.gov this page is titled 'Healthy housing and vector control'; the mockup title is unchanged.",
	sections: [
		{
			heading: 'Report a housing health issue',
			karl: "Maps to Topic's repeatable Spotlight block (Spotlight title = this heading, Spotlight description = the paragraph below, nested Button link = the button). Confirmed live: the real page's own Spotlight here links out to sf.gov/report-health-nuisance-or-hazards (a general citywide report path this mockup has no equivalent of); this mockup instead targets its own closest real analog, the rats/mice report Transaction.",
			kind: 'body',
			component: 'spotlight',
			paragraphs: [
				'Contact 311 to report healthy housing issues at homes, businesses, or other buildings.'
			],
			button: 'Start a report',
			buttonTarget: 'rodentsReport'
		},
		// Topic merge (Decided, Nov 24, 2026): the Healthy housing and pest
		// resources and Look up building records Resource Collections fold into
		// this page and are retired. Sections follow the Topic tab's suggested
		// structure, with the report pages grouped as Pests and Sanitation. Each
		// block is a Services or Resources block: Title + a Links list of SF.gov
		// pages or external links (docs/karl-export-field-map.md, Topic).
		{
			heading: 'Report pests',
			fieldKey: 'general-housing-issues',
			karl: 'Maps to a Services block (Title = this heading, Links = the cards). The Pests half of the report group (Decided). Report rats or mice and Report mosquitoes or standing water are 2 of the 9 condition pages (built 2026-11-25). The cockroaches page stays until the bed bug and cockroach pages replace it; the Step by step follows them as the overview.',
			kind: 'body',
			component: 'services',
			cards: [
				{ title: 'Report rats or mice', target: 'rodentsReport' },
				{ title: 'Report mosquitoes or standing water', target: 'mosquitoReport' },
				{
					title: 'Report cockroaches, mosquitoes, and other insects',
					target: 'insectsReport'
				},
				{ title: 'Report a pest problem, start to finish', target: 'stepPestReport' }
			]
		},
		{
			heading: 'Report sanitation problems',
			karl: 'Maps to a Services block. The Sanitation half of the report group (Decided). Report mold and Report garbage, clutter, or overgrown plants are 2 of the 9 condition pages (built 2026-11-25). The old combined page stays for animal waste and pigeons until those pages are built.',
			kind: 'body',
			component: 'services',
			cards: [
				{ title: 'Report mold', target: 'moldReport' },
				{ title: 'Report garbage, clutter, or overgrown plants', target: 'garbageReport' },
				{ title: 'Report garbage, mold, and overgrown vegetation', target: 'filthReport' }
			]
		},
		{
			heading: 'If you got a notice',
			karl: 'Maps to a Services block. Topic tab, suggested structure item 2, with the tenant Information page added beside the owner steps.',
			kind: 'body',
			component: 'services',
			cards: [
				{ title: 'Correct a violation and close your case', target: 'stepCorrectViolation' },
				{
					title: 'What tenants need to do after a Notice of Violation',
					target: 'tenantNoticeSteps'
				},
				{ title: 'Question a Notice of Violation', target: 'appealNotice' },
				{ title: 'Pay a Healthy Housing citation', target: 'payCitation' }
			]
		},
		{
			heading: 'For property owners',
			karl: 'Maps to a Services block. Topic tab, suggested structure item 3. The owner-duty pages are listed separately until their merge is decided.',
			kind: 'body',
			component: 'services',
			cards: [
				{
					title: 'Pay your annual Healthy Housing fee for apartment buildings',
					target: 'payFee'
				},
				{ title: 'Property owner responsibilities', target: 'ownerHub' },
				{ title: 'Article 11 compliance for property owners', target: 'article11Compliance' },
				{
					title: 'Integrated pest management for property owners and managers',
					target: 'ownerGuidance'
				}
			]
		},
		{
			heading: 'Look up records',
			karl: 'Maps to a Services block. Holds what the retired Look up building records Resource Collection listed: the three lookup Transactions and the public records request. Its annual fee link is under For property owners.',
			kind: 'body',
			component: 'services',
			cards: [
				{ title: 'Find complaints and inspection records', target: 'findRecords' },
				{ title: 'Find residential hotel and shelter records', target: 'findHotelRecords' },
				{
					title: 'Find your Healthy Housing inspector by neighborhood',
					target: 'inspectorLookup'
				},
				{ title: 'Make a public records request', target: 'publicRecords' }
			]
		},
		{
			heading: 'Learn more',
			fieldKey: 'guidance-and-resources',
			karl: 'Maps to a Resources block. Topic tab, suggested structure item 5, plus the pages the retired Healthy housing and pest resources collection linked that the list above lacks (who to call, guides in other languages, Rat-free blocks, the annual summary).',
			kind: 'body',
			component: 'resources',
			cards: [
				{ title: 'Learn what Healthy Housing and Vector Control can inspect', target: 'scopeInfo' },
				{ title: 'Who to call about a housing problem', target: 'whoToCall' },
				{ title: 'What happens after you report a housing or pest problem', target: 'afterReport' },
				{ title: 'Tenant rights when reporting housing conditions', target: 'tenantRights' },
				{ title: 'Health Code Article 11 in plain language', target: 'article11Guide' },
				{ title: 'Mosquito Control Program', target: 'mosquitoControl' },
				{ title: 'Rat-free blocks', target: 'ratFreeBlocks' },
				{ title: 'Guides in other languages', target: 'languageGuides' },
				{ title: 'Healthy Housing inspections: annual summary', target: 'inspectionsAnnual' }
			]
		},
		{
			heading: 'Guides and forms',
			karl: 'Maps to a Resources block of External links. Carries every outside document and site the retired Healthy housing and pest resources collection linked, so the fold loses none of them. The api.sf.gov documents are Document Picker uploads in Karl; confirm the current file before publishing.',
			kind: 'body',
			component: 'resources',
			cards: [
				{
					title: 'Prepare your unit for bed bug treatment',
					url: 'https://api.sf.gov/documents/23140/GuidelinesforUnitPreparation_dP56n7G.pdf'
				},
				{
					title: 'Residential building owner-operator guidelines for vector control',
					url: 'https://api.sf.gov/documents/52936/R_Residential_Bldg_Owner-Operator_Guidelines_for_Vector_Control_2026_0SYmmSc.html'
				},
				{
					title: 'Pest control reporting form',
					url: 'https://api.sf.gov/documents/23712/PCOReportingForm_2.xls'
				},
				{
					title: '16 Steps to a Healthy Home',
					url: 'https://api.sf.gov/documents/52246/16_Steps_to_a_Healthy_Home.html'
				},
				{
					title: 'Watch a roach-prevention video',
					url: 'https://www.youtube.com/watch?v=S-aJzCk-rNQ'
				},
				{
					title: 'UC IPM resources for homes and buildings',
					url: 'https://ipm.ucanr.edu/home-and-landscape/'
				},
				{
					title: 'Environmental health branch fee schedule',
					url: 'https://api.sf.gov/documents/17453/Website_Fees_FY25-26_fgM2WjX.pdf'
				}
			]
		},
		{
			heading: 'Related',
			karl: 'BLOCKED on U5. Topic has NO `related` field — confirmed at E1 on the live form, unlike Transaction, Information and Campaign, which do. This note previously cited the Karl Help Center as confirming Related support for Topic; the 2026-08-15 form capture contradicts it, and a measurement beats the Help Center. The two Campaign-type programs linked here are a sound editorial choice with nowhere on the Topic form to go: either they move into `content_fields` as a Resources block, or the page drops the panel. Needs a content decision.',
			kind: 'placement',
			component: 'related',
			cards: [
				{ title: 'Free mosquito education workshop', target: 'mosquitoWorkshop' },
				{ title: 'Free IPM education workshop', target: 'ipmEducation' }
			]
		}
	],
	// Karl's Partner agencies field — the exact pairing confirmed live on the
	// real sf.gov/topics--healthy-housing-conditions page itself.
	partnerAgencies: [
		{
			title: 'Department of Public Health',
			url: 'https://www.sf.gov/departments--department-public-health'
		},
		{
			title: 'Environmental Health',
			url: 'https://www.sf.gov/departments--department-public-health--environmental-health'
		}
	],
	seoTitle: 'Healthy housing conditions | SF.gov',
	metaDescription:
		'Report housing health issues, find services and resources, and learn how San Francisco protects healthy housing conditions.'
};
