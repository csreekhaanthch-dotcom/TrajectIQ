import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink, readFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { resumeContent, jobRequirements } = body;

    if (!resumeContent || !jobRequirements) {
      return NextResponse.json(
        { success: false, error: 'Missing resume content or job requirements' },
        { status: 400 }
      );
    }

    // Create temp files for resume and job requirements
    const timestamp = Date.now();
    const resumePath = join(tmpdir(), `resume_${timestamp}.txt`);
    const jobPath = join(tmpdir(), `job_${timestamp}.json`);
    const outputPath = join(tmpdir(), `output_${timestamp}.json`);

    // Write files
    await writeFile(resumePath, resumeContent);
    await writeFile(jobPath, JSON.stringify(jobRequirements, null, 2));

    // Create Python script to run evaluation
    const pythonScript = `
import sys
import json
sys.path.insert(0, '/home/z/my-project/download/trajectiq/backend')

from orchestration.pipeline import TrajectIQPipeline

try:
    # Load job requirements
    with open("${jobPath}", "r") as f:
        job_reqs = json.load(f)
    
    pipeline = TrajectIQPipeline()
    
    result = pipeline.evaluate_candidate(
        resume_path="${resumePath}",
        job_requirements=job_reqs,
        candidate_id="CAND-${timestamp}",
        job_id=job_reqs.get("job_id", "JOB-${timestamp}")
    )
    
    # Convert to JSON-serializable format
    def convert(obj):
        if hasattr(obj, '__dict__'):
            return {k: convert(v) for k, v in obj.__dict__.items() if not k.startswith('_')}
        elif isinstance(obj, (list, tuple)):
            return [convert(i) for i in obj]
        elif isinstance(obj, dict):
            return {k: convert(v) for k, v in obj.items()}
        else:
            return obj
    
    with open("${outputPath}", "w") as f:
        json.dump({"success": True, "data": convert(result)}, f)
        
except Exception as e:
    import traceback
    with open("${outputPath}", "w") as f:
        json.dump({"success": False, "error": str(e), "traceback": traceback.format_exc()}, f)
`;

    const scriptPath = join(tmpdir(), `eval_${timestamp}.py`);
    await writeFile(scriptPath, pythonScript);

    // Run Python evaluation
    try {
      const { stdout, stderr } = await execAsync(
        `python3 "${scriptPath}"`,
        { timeout: 60000, maxBuffer: 1024 * 1024 * 10 }
      );

      // Read output file
      const outputContent = await readFile(outputPath, 'utf-8');
      const result = JSON.parse(outputContent);

      // Clean up temp files
      await Promise.all([
        unlink(resumePath).catch(() => {}),
        unlink(jobPath).catch(() => {}),
        unlink(scriptPath).catch(() => {}),
        unlink(outputPath).catch(() => {}),
      ]);

      return NextResponse.json(result);

    } catch (execError: any) {
      // Clean up on error
      await Promise.all([
        unlink(resumePath).catch(() => {}),
        unlink(jobPath).catch(() => {}),
        unlink(scriptPath).catch(() => {}),
      ]);

      return NextResponse.json(
        { success: false, error: execError.message || 'Evaluation failed' },
        { status: 500 }
      );
    }

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
