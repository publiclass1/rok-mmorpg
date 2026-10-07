-- Job Master: Knight 2nd job + all 1st jobs (align with content/ro/jobMaster.json)

update public.npc_definitions
set config = '{
  "offers": [
    {"jobId": "swordman", "fromJobId": "novice", "requiredJobLevel": 10, "requiredBaseLevel": 1, "zenyCost": 0},
    {"jobId": "mage", "fromJobId": "novice", "requiredJobLevel": 10, "requiredBaseLevel": 1, "zenyCost": 0},
    {"jobId": "archer", "fromJobId": "novice", "requiredJobLevel": 10, "requiredBaseLevel": 1, "zenyCost": 0},
    {"jobId": "acolyte", "fromJobId": "novice", "requiredJobLevel": 10, "requiredBaseLevel": 1, "zenyCost": 0},
    {"jobId": "merchant", "fromJobId": "novice", "requiredJobLevel": 10, "requiredBaseLevel": 1, "zenyCost": 0},
    {"jobId": "thief", "fromJobId": "novice", "requiredJobLevel": 10, "requiredBaseLevel": 1, "zenyCost": 0},
    {"jobId": "knight", "fromJobId": "swordman", "requiredJobLevel": 40, "requiredBaseLevel": 40, "zenyCost": 0}
  ],
  "facing": "down"
}'::jsonb
where id = 'prontera_job_master';
