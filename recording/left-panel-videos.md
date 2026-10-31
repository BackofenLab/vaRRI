# Left-panel video council

The UX, RNA-domain, and recording-QA agents reviewed the real controls,
documentation, existing recordings, and small input fixtures. They agreed on
seven new task-focused videos and reuse of five existing videos.

| New video | Teaching point | Observable result |
| --- | --- | --- |
| Choose an example | Load a complete example configuration | Inputs, selection and annotated drawing change together |
| Name and number a strand | Commit a strand name and biological start index | Name changes; numbering crosses from -2 to 1, skipping zero |
| Add a subsequence highlight | Choose a strand, biological range and opacity | Highlight follows the chosen nucleotides and appears in the list |
| Annotate a point mutation | Add a replacement annotation at a biological position | Mutation notation and replacement label appear; supplied input is retained |
| Highlight RRI nucleotides | Compare whole interaction region with paired bases | Bulged example shows ten outlined nodes versus eight |
| Highlight the RRI background | Compare one region with separate paired stacks | Generated entries and polygons follow the chosen mode |
| Make the RRI horizontal | Enable a linear interaction layout with Force layout off | Paired rails align horizontally and remain stable |

The sequence panel also reuses FASTA import and saved-session videos. The text,
region, and probability panels reuse text placement, manual paired regions, and
probability profiles. This avoids duplicate explanations of existing workflows.

Each relevant control has a small, muted video icon. Hovering or focusing it opens
the matching player; click or tap keeps it open. Desktop buttons are transparent
24-pixel targets with 16-by-12-pixel symbols, and touch targets are larger. Players
provide native controls, optional captions, transcripts and downloads. Reduced
motion disables hover autoplay, and closing a panel stops and rewinds its videos.

## Recording and review

Implement and review the seven new scenes sequentially. A dedicated agent owns
each scene, checks the real outcome, and visually reviews its video, poster,
caption track and decoded frames. Shared presentation remains unchanged:
centered instructions, reading time before gestures, amber action feedback,
and no reading-instruction footer.

Use small valid RNA fixtures and existing colors. Keep force layout off and
describe a settled result; repeated still frames do not show continuous physics.
The horizontal-layout clip uses the asymmetric nine-base fixture
`GGAGG&CCCC` / `((.((&))))`: its initial paired rails are visibly bent, unlike
the symmetric highlighting fixture, which already starts horizontal.
Mutation wording must describe an annotation, not a prediction or input edit.
Use the biological coordinates shown in the panel, including skipped zero.

The new media must pass normal encoded playback, duration, size and source
provenance checks before joining the complete published catalog. Review reports
and galleries remain under ignored `output/playwright/left-panel-videos/`.
