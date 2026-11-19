using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Text;
using System.Threading;
using System.Windows.Forms;

namespace SitePilotLauncher {
    static class Program {
        public const string Address = "http://127.0.0.1:47831";
        [STAThread]
        static void Main() {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            bool created;
            using (Mutex gate = new Mutex(true, "Local\\SitePilot.47831", out created)) {
                if (Healthy()) { OpenBrowser(); return; }
                if (!created) { MessageBox.Show("Another SitePilot session is running or starting. If you are upgrading, quit the previous version from its notification-area icon, then open SitePilot V1.1 again.", "SitePilot", MessageBoxButtons.OK, MessageBoxIcon.Information); return; }
                string folder = AppDomain.CurrentDomain.BaseDirectory;
                string runtime = Path.Combine(folder, "runtime", "node.exe");
                if (!File.Exists(runtime) || !File.Exists(Path.Combine(folder, "dist", "index.html"))) {
                    MessageBox.Show("SitePilot is missing required application files. Extract the complete ZIP into a folder, then double-click SitePilot.exe inside that folder. Do not run it from inside the ZIP.", "SitePilot could not start", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    return;
                }
                try { Application.Run(new PilotContext(folder, runtime)); }
                catch (Exception ex) { MessageBox.Show("SitePilot could not start. " + ex.Message, "SitePilot", MessageBoxButtons.OK, MessageBoxIcon.Error); }
            }
        }
        public static bool Healthy() {
            try {
                HttpWebRequest request = (HttpWebRequest)WebRequest.Create(Address + "/api/health");
                request.Proxy = null; request.Timeout = 600; request.ReadWriteTimeout = 600;
                using (WebResponse response = request.GetResponse())
                using (StreamReader reader = new StreamReader(response.GetResponseStream()))
                    { string status = reader.ReadToEnd(); return status.Contains("\"app\":\"SitePilot\"") && status.Contains("\"version\":\"1.1.0\""); }
            } catch { return false; }
        }
        public static void OpenBrowser() {
            try { Process.Start(new ProcessStartInfo(Address) { UseShellExecute = true }); }
            catch { MessageBox.Show("SitePilot is running. Open " + Address + " in your browser.", "SitePilot", MessageBoxButtons.OK, MessageBoxIcon.Information); }
        }
    }
    sealed class PilotContext : ApplicationContext {
        readonly Process server;
        readonly NotifyIcon tray;
        readonly System.Windows.Forms.Timer timer;
        readonly Form splash;
        readonly StringBuilder log = new StringBuilder();
        readonly string folder;
        int ticks;
        bool opened, stopping;
        public PilotContext(string appFolder, string runtime) {
            folder = appFolder;
            splash = new Form { Text = "SitePilot", Width = 420, Height = 175, StartPosition = FormStartPosition.CenterScreen, FormBorderStyle = FormBorderStyle.FixedDialog, MaximizeBox = false, MinimizeBox = false, BackColor = Color.White };
            splash.Controls.Add(new Label { Text = "SitePilot", Font = new Font("Segoe UI", 22, FontStyle.Bold), ForeColor = Color.FromArgb(8, 127, 120), Left = 27, Top = 20, AutoSize = true });
            splash.Controls.Add(new Label { Text = "Opening your location workspace...", Font = new Font("Segoe UI", 10), ForeColor = Color.FromArgb(70, 89, 108), Left = 29, Top = 75, AutoSize = true });
            splash.FormClosing += delegate { if (!opened && !stopping) Stop(); };
            splash.Show();
            Icon icon = File.Exists(Path.Combine(folder,"app.ico")) ? new Icon(Path.Combine(folder,"app.ico")) : SystemIcons.Application;
            splash.Icon = icon;
            ContextMenuStrip menu = new ContextMenuStrip();
            menu.Items.Add("Open SitePilot", null, delegate { Program.OpenBrowser(); });
            menu.Items.Add("Open getting-started guide", null, delegate { Process.Start(new ProcessStartInfo(Path.Combine(folder,"Getting Started.html")) { UseShellExecute = true }); });
            menu.Items.Add(new ToolStripSeparator());
            menu.Items.Add("Quit SitePilot", null, delegate { Stop(); });
            tray = new NotifyIcon { Icon = icon, Text = "SitePilot — local workspace", ContextMenuStrip = menu, Visible = true };
            tray.DoubleClick += delegate { Program.OpenBrowser(); };
            server = new Process { StartInfo = new ProcessStartInfo(runtime, "\"" + Path.Combine(folder,"server.mjs") + "\"") { WorkingDirectory = folder, UseShellExecute = false, CreateNoWindow = true, WindowStyle = ProcessWindowStyle.Hidden, RedirectStandardOutput = true, RedirectStandardError = true } };
            server.OutputDataReceived += AddLog; server.ErrorDataReceived += AddLog;
            server.Start(); server.BeginOutputReadLine(); server.BeginErrorReadLine();
            timer = new System.Windows.Forms.Timer { Interval = 500 };
            timer.Tick += Check; timer.Start();
        }
        void AddLog(object sender, DataReceivedEventArgs e) { if (e.Data != null) lock(log) { if(log.Length < 16000)log.AppendLine(e.Data); } }
        void Check(object sender, EventArgs e) {
            if (stopping) return;
            if (server.HasExited) { Fail("The local server stopped. Another application may be using port 47831.\n\n" + log.ToString()); return; }
            if (!opened && Program.Healthy()) {
                opened = true; splash.Close(); Program.OpenBrowser(); timer.Interval = 2500;
                tray.ShowBalloonTip(4000, "SitePilot is ready", "Your workspace is open in your browser. Use this tray icon to reopen or quit.", ToolTipIcon.Info);
            } else if (!opened && ++ticks > 30) { Fail("The local server did not become ready.\n\n" + log.ToString()); }
        }
        void Fail(string message) {
            try { File.WriteAllText(Path.Combine(folder,"runtime","startup.log"), message); } catch { }
            MessageBox.Show(message, "SitePilot could not start", MessageBoxButtons.OK, MessageBoxIcon.Error); Stop();
        }
        void Stop() {
            if (stopping) return; stopping = true;
            if (timer != null) timer.Stop();
            if (server != null) { try { if (!server.HasExited) { server.Kill(); server.WaitForExit(3000); } server.Dispose(); } catch { } }
            if (tray != null) { tray.Visible = false; tray.Dispose(); }
            if (splash != null) splash.Dispose();
            ExitThread();
        }
        protected override void ExitThreadCore() { if(!stopping) { Stop(); return; } base.ExitThreadCore(); }
    }
}
