import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const webhookUrl = Deno.env.get('TASK_REMINDER_WEBHOOK_URL')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

Deno.serve(async (req) => {
  try {
    console.log('Checking for task reminders...');

    // Get tasks with reminders that are due
    const now = new Date().toISOString();
    const { data: tasks, error } = await supabase
      .from('work_tasks')
      .select('*')
      .lte('reminder_at', now)
      .neq('status', 'done')
      .not('reminder_at', 'is', null);

    if (error) {
      console.error('Error fetching tasks:', error);
      throw error;
    }

    console.log(`Found ${tasks?.length || 0} tasks with due reminders`);

    if (!tasks || tasks.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No tasks with due reminders' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Send Discord notifications for each task
    const notifications = await Promise.allSettled(
      tasks.map(async (task) => {
        const embed = {
          title: '⏰ Task Reminder',
          description: task.title,
          color: 5814783, // Blurple color
          fields: [
            {
              name: 'Status',
              value: task.status,
              inline: true,
            },
            {
              name: 'Assigned To',
              value: task.assigned_to || 'Unassigned',
              inline: true,
            },
            {
              name: 'Priority',
              value: task.priority || 'Not set',
              inline: true,
            },
          ],
          timestamp: new Date().toISOString(),
        };

        if (task.description) {
          // Strip HTML tags for Discord
          const plainDescription = task.description.replace(/<[^>]*>/g, '');
          if (plainDescription.length > 0) {
            embed.fields.push({
              name: 'Details',
              value: plainDescription.substring(0, 1024), // Discord field limit
              inline: false,
            });
          }
        }

        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            embeds: [embed],
          }),
        });

        if (!response.ok) {
          console.error(`Failed to send Discord notification for task ${task.id}:`, await response.text());
          throw new Error(`Discord webhook failed with status ${response.status}`);
        }

        // Clear the reminder_at field after sending
        await supabase
          .from('work_tasks')
          .update({ reminder_at: null })
          .eq('id', task.id);

        console.log(`Sent reminder for task: ${task.title}`);
        return { taskId: task.id, success: true };
      })
    );

    const successful = notifications.filter(r => r.status === 'fulfilled').length;
    const failed = notifications.filter(r => r.status === 'rejected').length;

    console.log(`Reminder check complete: ${successful} sent, ${failed} failed`);

    return new Response(
      JSON.stringify({
        message: 'Reminder check complete',
        tasksChecked: tasks.length,
        successful,
        failed,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in check-task-reminders:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
