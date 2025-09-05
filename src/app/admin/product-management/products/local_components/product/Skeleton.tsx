import React from "react";

export default function Skeleton() {
	return (
		<div className={`tableContent`}>
			<div className={`formContainer`}>
				<div className={`formHeader`}>
					<div className={`skeletonTitle`}></div>
					<div className={`skeletonActions`}>
						<div className={`skeletonButton`}></div>
						<div className={`skeletonButton`}></div>
					</div>
				</div>

				<div className={`formFields`}>
					<div className={`formRow`}>
						<div className={`formField`}>
							<div className={`skeletonLabel`}></div>
							<div className={`skeletonInput`}></div>
						</div>
						<div className={`formField`}>
							<div className={`skeletonLabel`}></div>
							<div className={`skeletonInput`}></div>
						</div>
					</div>

					<div className={`formRow`}>
						<div className={`formField`}>
							<div className={`skeletonLabel`}></div>
							<div className={`skeletonInput`}></div>
						</div>
						<div className={`formField`}>
							<div className={`skeletonLabel`}></div>
							<div className={`skeletonInput`}></div>
						</div>
					</div>

					<div className={`formRow`}>
						<div className={`formField`}>
							<div className={`skeletonLabel`}></div>
							<div className={`skeletonInput`}></div>
						</div>
						<div className={`formField`}>
							<div className={`skeletonLabel`}></div>
							<div className={`skeletonInput`}></div>
						</div>
					</div>

					<div className={`formRow`}>
						<div className={`formField`}>
							<div className={`skeletonLabel`}></div>
							<div className={`skeletonSelect`}></div>
						</div>
						<div className={`formField`}>
							<div className={`skeletonLabel`}></div>
							<div className={`skeletonSelect`}></div>
						</div>
					</div>

					<div className={`formField`}>
						<div className={`skeletonLabel`}></div>
						<div className={`skeletonTextarea`}></div>
					</div>
				</div>
			</div>
		</div>
	);
}
