import matplotlib.pyplot as plt
import matplotlib.patches as patches

# --- CONFIGURATION ---
fig, ax = plt.subplots(figsize=(14, 8))

# Define neutral colors for each year
colors = ["#D5C7BC", "#A9B388", "#8E9AAF", "#7D8570"] # Taupe, Sage, Slate, Stone
slack_color = "#E5E5E5" # Light grey for slack/buffer

# Task Data: (Year, Start Quarter, Duration, Label)
# Quarters are 0-indexed (0 to 15 for 4 years)
tasks = [
    # Year 1
    (0, 0, 2, "Literature Review", 0),
    (0, 1.5, 2, "Baseline FL-IDS Implementation", 0),
    (0, 3, 1, "Slack / Buffer", -1), # -1 indicates slack color
    
    # Year 2
    (1, 4, 2, "Robustness Algorithm Design", 1),
    (1, 5.5, 2.5, "Adversarial Attack Simulations", 1),
    (1, 7.5, 0.5, "Slack / Buffer", -1),
    
    # Year 3
    (2, 8, 2, "Privacy-Preserving Integration", 2),
    (2, 9, 2, "Lightweight Model Compression", 2),
    (2, 10, 2, "Heterogeneous Env. Testing", 2),
    (2, 11, 1, "Potential Drop-off / Slack", -1),
    
    # Year 4
    (3, 12, 1.5, "Comprehensive Evaluation", 3),
    (3, 13, 2, "Trade-off Analysis", 3),
    (3, 12, 4, "Thesis Writing & Dissemination", 3),
]

# Plotting
for i, (year, start, duration, label, color_idx) in enumerate(tasks[::-1]):
    color = colors[color_idx] if color_idx != -1 else slack_color
    ax.barh(i, duration, left=start, color=color, edgecolor='white', height=0.6)
    ax.text(start + 0.1, i, label, va='center', fontsize=10, fontweight='bold' if color_idx != -1 else 'normal')

# Formatting Axes
ax.set_xticks(range(0, 17))
ax.set_xticklabels(['Q1\nY1', 'Q2', 'Q3', 'Q4', 'Q1\nY2', 'Q2', 'Q3', 'Q4', 
                    'Q1\nY3', 'Q2', 'Q3', 'Q4', 'Q1\nY4', 'Q2', 'Q3', 'Q4', 'End'])
ax.set_yticks([])
ax.set_title("FL-IDS Research Timeline: 4-Year Roadmap", fontsize=16, pad=20)
ax.grid(axis='x', linestyle='--', alpha=0.3)

# Legend
legend_elements = [patches.Patch(facecolor=colors[i], label=f'Year {i+1}') for i in range(4)]
legend_elements.append(patches.Patch(facecolor=slack_color, label='Slack / Buffer'))
ax.legend(handles=legend_elements, loc='upper center', bbox_to_anchor=(0.5, -0.1), ncol=5)

plt.tight_layout()
plt.show()