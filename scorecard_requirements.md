this is an example url for the match scorecard withinthe tournament event /tournaments/36f3d474-c803-4370-be86-96369bd6ef5f/matches/8f2f0877-aa10-4111-a8e1-966976fe9760/scorecard

# Golf Scorecard & Scoring Application Requirements

You are tasked with implementing a comprehensive golf scorecard and scoring system that handles multiple tournament formats. The system must accurately display the appropriate scorecard layout based on the event format and properly calculate scores, winners, and additional contest results.

## Core Scorecard Requirements

1. The scorecard must dynamically adjust its display based on the selected event format:
   - For singles matches (1v1): Display individual player names and their respective scores
   - For team events: Display team names and appropriate scoring fields based on format
   - All scorecards must include hole information (par, handicap index, and yardage)

2. The scorecard must support the following formats:
   - Singles (1v1): Standard individual match play or stroke play
   - Best Ball (2v2): Only the best individual net score from each team counts per hole
   - Alternate Shot (2v2): Teams take turns hitting one ball, only one gross score per team
   - Scramble (2v2): Team members each hit, select best shot, then all play from there, only one gross score per team
   - Scramble (4v4): Same as 2v2 scramble but with 4-person teams, only one gross score per team

3. Course data integration:
   - Scorecard must load and display the correct course data including:
     - Hole numbers (1-18)
     - Par values for each hole
     - Handicap index for each hole (1-18 difficulty rating)
     - Yardage for each hole

## Scoring Implementation Requirements

1. Handicap application:
   - System must correctly apply player handicaps based on the event format
   - For singles: Apply individual handicaps to calculate net scores
   - For Best Ball: Apply individual handicaps to determine best net score per hole
   - For Alternate Shot: Apply team handicap (method already implemented)
   - For Scrambles: Apply team handicap (method already implemented)

2. Match outcome determination:
   - System must calculate and display the winner and loser for each match
   - For singles: Compare final scores (net or gross as appropriate)
   - For team events: Compare team scores according to format rules

3. Special contest scoring:
   - Skins: Automatically identify and track skins across all formats
   - Closest to Pin (CTP): Record and validate CTP results
   - Verify that the inter-event skins/CTP calculations are functioning correctly

## Testing and Validation Requirements

1. Verify that scorecards display correctly for all formats:
   - Singles (1v1): Shows two individual players
   - Best Ball (2v2): Shows four players but calculates best net score per team
   - Alternate Shot (2v2): Shows team names with single score entry
   - Scrambles: Shows team names with single score entry

2. Validate scoring accuracy:
   - Test handicap application across all formats
   - Verify net score calculations
   - Confirm winner/loser determination is correct for all match types

3. Verify special contest functionality:
   - Test skins calculations across different formats
   - Validate CTP recording and reporting

## Additional Considerations

1. Error handling:
   - Implement validation for score entry (no negative scores, scores within reasonable range)
   - Handle incomplete scorecards appropriately

2. User experience:
   - Ensure intuitive layout based on match format
   - Provide clear visualization of current standings/results

Your implementation needs to be flexible enough to handle all these formats while maintaining accuracy in scoring and results calculation. The existing handicap application system is already built - your task is to ensure the scorecard display and scoring logic work correctly with it.